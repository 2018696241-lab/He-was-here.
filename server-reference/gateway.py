"""Loopback-only brother gateway. Standard library; no answers in durable storage."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TZ=dt.timezone(dt.timedelta(hours=8))
# Cost is settled against the provider's reported usage, never against the byte bound
# below: UTF-8 overstates Chinese tokens by roughly 3x, so budgeting on bytes would let
# a single call swallow most of the session allowance.
SESSION_CAP=400000  # micro CNY = 0.4 CNY per conversation, across all 18 calls
REQUEST_CAP=150000  # micro CNY = 0.15 CNY per call, also the in-flight hold
BUILD='20261019-rz7'
WEIGHTS=[10,10,10,15,10,25,20]
QUESTIONS=['你是谁？','你知道我是谁吗？','你还记得哥哥生日是哪天吗？','小周，你的病现在怎么样了？','可以教哥哥折船吗？','你还和聚财弟弟有联系吗？','你回老宅，是想找什么吗？']
CONTEXT_KEYS=('read','clues','keys','progress','marks')
# Framing overhead: 256 bytes per message plus a fixed 1024 allowance.
FRAMING=1024
# Oversized-prompt guard only; the money guard is SESSION_CAP.
MAX_REQUEST=48000
# Headroom reserved above MAX_REQUEST so a borderline prompt can be trimmed instead of rejected.
SAFE_REQUEST=46000
MAX_CLUE_IDS=20
MAX_RECENT_CHAT=3
# role.md + plot.md already fill ~12k bytes, so the system prompt needs real headroom.
SYSTEM_CLIP=20000
LIMITS={'answer':1024,'summary':4096,'chat':2048}

def clip(text,limit):
    """Cut to a utf-8 byte budget without splitting a character."""
    raw=str(text).encode('utf-8')
    if len(raw)<=limit:return str(text)
    return raw[:limit].decode('utf-8','ignore')

# Keys that only ever belong to the summary payload. Seeing them means the model
# answered an ordinary question with the scoring template.
SCORE_KEYS=('"questionId"','"score"','"evidence"','"feedback"','"items"')

def plain(raw):
    """Reduce a reply to the prose a player should read.

    Two failures are handled here. The model sometimes answers a normal question
    with the whole summary JSON, which used to be shown to the player verbatim. And
    it sometimes prefixes every line with the listener's name, which reads as a
    template rather than a person. Neither survives here.
    """
    text=str(raw).strip()
    # Fenced blocks and a bare JSON object both reduce to their reply field.
    fenced=re.search(r'```(?:json)?\s*(.+?)\s*```',text,re.S)
    if fenced:text=fenced.group(1).strip()
    if any(key in text for key in SCORE_KEYS):
        try:
            obj=json.loads(re.sub(r'^```json\s*|\s*```$','',text))
        except Exception:obj=None
        if isinstance(obj,dict):
            body=obj.get('reply')
            if isinstance(body,str) and body.strip():
                items=obj.get('items')
                # Drop the feedback echoes that come with the template.
                text=' '.join(x.get('feedback','') for x in items if isinstance(x,dict) and isinstance(x.get('feedback'),str)) if isinstance(items,list) else ''
                text=(body+' '+text).strip()
    text=re.sub(r'(?m)^\s{0,4}[-*+]\s+','',text)
    text=re.sub(r'\n{3,}','\n\n',text).strip()
    # "小周，" at the head of every paragraph is the tell of a generated reply.
    # Keep the first, drop the rest; never strip the one at position zero.
    parts=text.split('\n')
    seen=False
    for i,line in enumerate(parts):
        stripped=re.sub(r'^\s*小周\s*[，。,、：:]+\s*','',line)
        if stripped!=line:
            if not seen:
                seen=True
            else:
                parts[i]=stripped
    text='\n'.join(parts)
    text=re.sub(r'[ \t]{2,}',' ',text)
    return text.strip() or '……这个哥哥记不清了。'

class Failure(Exception):
    def __init__(self,code,status=409):self.code,self.status=code,status

class Gateway:
    def __init__(self,config_path,ledger,role_path,provider=None,clock=time.time):
        self.config_path=Path(config_path);self.role=Path(role_path).read_text(encoding='utf-8');self.clock=clock
        plot=Path(role_path).with_name('plot.md')
        self.plot=plot.read_text(encoding='utf-8') if plot.exists() else ''
        self.db=sqlite3.connect(ledger,check_same_thread=False,isolation_level=None)
        self.db.executescript('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY, day TEXT, amount INTEGER, status TEXT, input_tokens INTEGER, output_tokens INTEGER); CREATE TABLE IF NOT EXISTS ip_days(day TEXT, ip TEXT, count INTEGER, PRIMARY KEY(day,ip));')
        self.lock=threading.RLock();self.slots=threading.BoundedSemaphore(2);self.sessions={};self.provider=provider or self.deepseek
    def config(self):return json.loads(self.config_path.read_text(encoding='utf-8'))
    def day(self):return dt.datetime.fromtimestamp(self.clock(),TZ).date().isoformat()
    def purge(self):
        with self.lock:
            for sid in list(self.sessions):
                if self.clock()-self.sessions[sid]['t']>1800 and not self.sessions[sid]['busy']:del self.sessions[sid]
    def available(self):
        c=self.config()
        return bool(c.get('enabled') and c['model']==c['verified_model']=='deepseek-flash' and c['price_verified_on']<=self.day()<=c['price_expires_on'] and (os.environ.get('DEEPSEEK_API_KEY') or self.provider!=self.deepseek))
    def health(self):
        with self.lock:used=self.db.execute('SELECT COALESCE(SUM(amount),0) FROM calls WHERE day=?',(self.day(),)).fetchone()[0]
        return dict(service='renzeng-brother-gateway',protocol=2,build=BUILD,role=bool(self.role.strip()),plot=bool(self.plot.strip()),ready=self.available() and used+REQUEST_CAP<=min(10000000,self.config()['daily_micro_cny']),capabilities=dict(question=True,summary=True,chat=True))
    def create(self,ip):
        if not self.health()['ready']:raise Failure('unavailable',503)
        with self.lock:
            for sid in list(self.sessions):
                if self.clock()-self.sessions[sid]['t']>1800 and not self.sessions[sid]['busy']:del self.sessions[sid]
            day=self.day();hashed=hashlib.sha256((day+ip).encode()).hexdigest()
            self.db.execute('BEGIN IMMEDIATE')
            try:
                n=self.db.execute('SELECT count FROM ip_days WHERE day=? AND ip=?',(day,hashed)).fetchone()
                if n and n[0]>=5:raise Failure('session_limit',429)
                self.db.execute('INSERT INTO ip_days VALUES(?,?,1) ON CONFLICT(day,ip) DO UPDATE SET count=count+1',(day,hashed));self.db.execute('COMMIT')
            except Exception:self.db.execute('ROLLBACK');raise
            sid=secrets.token_urlsafe(32)
            self.sessions[sid]=dict(t=self.clock(),busy=False,answers=[],replies=[],chat=[],summary=None,requests={},spent=0)
            return dict(sessionId=sid,nextQuestion=1)
    def reserve(self,rid):
        with self.lock:
            self.db.execute('BEGIN IMMEDIATE')
            try:
                used=self.db.execute('SELECT COALESCE(SUM(amount),0) FROM calls WHERE day=?',(self.day(),)).fetchone()[0]
                if used+REQUEST_CAP>min(10000000,self.config()['daily_micro_cny']):raise Failure('daily_budget',429)
                self.db.execute('INSERT INTO calls VALUES(?,?,?, ?,NULL,NULL)',(rid,self.day(),REQUEST_CAP,'reserved'));self.db.execute('COMMIT')
            except Exception:self.db.execute('ROLLBACK');raise
    def deepseek(self,messages,limit,c):
        body=json.dumps(dict(model=c['model'],messages=messages,max_tokens=limit,thinking={'type':'disabled'},stream=False),ensure_ascii=False).encode()
        req=urllib.request.Request(c['provider_url'],body,{'Authorization':'Bearer '+os.environ['DEEPSEEK_API_KEY'],'Content-Type':'application/json'})
        with urllib.request.urlopen(req,timeout=45) as response:return json.loads(response.read(1000000))
    def clean_context(self,raw):
        """Accept only short id lists and counters from the client; never free-form player text."""
        if not isinstance(raw,dict):return {}
        out={}
        for key in ('read','clues','keys'):
            items=raw.get(key)
            if isinstance(items,list):out[key]=[str(x)[:48] for x in items if isinstance(x,(str,int))][:MAX_CLUE_IDS]
        marks=raw.get('marks')
        if isinstance(marks,list):out['marks']=[str(x)[:32] for x in marks if isinstance(x,str)][:6]
        progress=raw.get('progress')
        if isinstance(progress,dict):out['progress']={k:int(progress[k]) for k in list(progress)[:6] if isinstance(progress.get(k),(int,float)) and not isinstance(progress.get(k),bool)}
        return out
    def fit_context(self,kind,answers,chat,context,answer=''):
        """Assemble the prompt within the byte budget so a request is never rejected for size."""
        system=self.role+self.plot
        if kind!='chat':system=clip(system,SYSTEM_CLIP)
        history=[{'question':QUESTIONS[i],'answer':a} for i,a in enumerate(answers)]
        # Trim the earliest answers hardest: their substance is already carried by role/plot.
        # 500 player characters are 1500 utf-8 bytes, so the first budget must clear that.
        for i,item in enumerate(history):item['answer']=clip(item['answer'],max(120,2000-600*i))
        # The current answer is never trimmed: the summary validator quotes it back.
        payload={'task':kind,'history':history,'answer':answer}
        if kind=='answer':payload['question']=QUESTIONS[len(answers)]
        if chat and kind=='chat':
            payload['recent_chat']=[{'answer':clip(x.get('answer',''),1500),'reply':clip(x.get('reply',''),1200)} for x in chat[-MAX_RECENT_CHAT:]]
        if context:payload['context']=context
        tail=('\n\n【本次只输出总结JSON对象，不要输出任何其他文字。】' if kind=='summary' else
 '\n\n【本次输出格式：只写给弟弟看的一句话到三句中文口语，像在聊天框里打字。'
 '只回现在问的这一件事，不要提别的问题，不要重复自我介绍。'
 '禁止输出JSON、括号、引号、字段名(questionId/score/evidence/feedback)、列表、markdown。'
 '不要给出题、判分、评分。不要每段都以「小周」开头。】')
        def build():
            return [{'role':'system','content':clip(system,SYSTEM_CLIP)+tail},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}]
        messages=build()
        if self.weight(messages)<=SAFE_REQUEST:return messages
        # Drop optional payload sections before ever touching role/plot or the answers.
        payload.pop('context',None);messages=build()
        if self.weight(messages)<=SAFE_REQUEST:return messages
        payload.pop('recent_chat',None);messages=build()
        if self.weight(messages)<=SAFE_REQUEST:return messages
        for item in history:item['answer']=clip(item['answer'],80)
        return build()
    @staticmethod
    def weight(messages):return sum(len(m['content'].encode('utf-8'))+256 for m in messages)+FRAMING
    def submit(self,kind,p):
        sid=p.get('sessionId','');rid=p.get('requestId','');answer=p.get('answer','');context=self.clean_context(p.get('context'))
        if not isinstance(rid,str) or not re.fullmatch(r'[A-Za-z0-9_-]{16,80}',rid):raise Failure('invalid_request',400)
        if not isinstance(answer,str) or (kind!='summary' and (not answer.strip() or len(answer)>500)):raise Failure('answer_length',400)
        signature=hashlib.sha256(json.dumps([kind,answer,context],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        with self.lock:
            s=self.sessions.get(sid)
            if not s or self.clock()-s['t']>1800:raise Failure('session_expired',410)
            if rid in s['requests']:
                cached=s['requests'][rid]
                if cached['signature']!=signature:raise Failure('request_conflict')
                if 'error' in cached:raise Failure(cached['error'],503)
                if 'result' in cached:return cached['result']
                raise Failure('request_pending')
            if s['busy']:raise Failure('session_busy',429)
            if kind=='answer' and len(s['answers'])>=7 or kind=='summary' and (len(s['answers'])!=7 or s['summary']) or kind=='chat' and (not s['summary'] or len(s['chat'])>=10):raise Failure('stage')
            if kind not in ('answer','summary','chat'):raise Failure('route',404)
            # Admission reserves a full REQUEST_CAP up front, so actual spend for the
            # whole conversation can never pass SESSION_CAP.
            if s['spent']+REQUEST_CAP>SESSION_CAP:raise Failure('session_budget',429)
            if not self.available():raise Failure('unavailable',503)
            if not self.slots.acquire(blocking=False):raise Failure('busy',429)
            s['busy']=True;s['t']=self.clock();s['requests'][rid]={'signature':signature}
        key=hashlib.sha256((sid+rid).encode()).hexdigest();reserved=False
        try:
            c=self.config();limit=LIMITS[kind]
            messages=self.fit_context(kind,s['answers'],s['chat'],context,answer)
            # UTF-8 bytes plus framing is deliberately above byte-token vocabulary bounds;
            # this only rejects pathological prompts. The money guard is SESSION_CAP above.
            upper=sum(len(m['content'].encode('utf-8'))+256 for m in messages)+FRAMING
            if upper>MAX_REQUEST:raise Failure('request_budget',413)
            self.reserve(key);reserved=True
            with self.lock:s['spent']+=REQUEST_CAP
            response=self.provider(messages,limit,c)
            usage=response.get('usage',{});inp=usage.get('prompt_tokens');out=usage.get('completion_tokens')
            if type(inp)!=int or type(out)!=int or min(inp,out)<0:raise Failure('usage_unknown',503)
            amount=int(__import__('math').ceil(inp*c['input_cny_per_million']+out*c['output_cny_per_million']))
            with self.lock:
                self.db.execute('UPDATE calls SET amount=?,status=?,input_tokens=?,output_tokens=? WHERE id=?',(amount,'settled',inp,out,key))
                # Hand back the unused part of the hold. A failed call keeps the full
                # hold, matching the 'uncertain' ledger row and never under-counting.
                s['spent']+=amount-REQUEST_CAP
            raw=response['choices'][0]['message']['content']
            if not isinstance(raw,str) or not raw.strip():raise Failure('invalid_reply',502)
            if kind=='summary':
                result=json.loads(re.sub(r'^```json\s*|\s*```$', '', raw.strip()));items=result['items']
                if len(items)!=7 or not isinstance(result['reply'],str):raise Failure('invalid_summary',502)
                for i,item in enumerate(items):
                    if item.get('questionId')!=i+1 or type(item.get('score'))!=int or not 0<=item['score']<=WEIGHTS[i] or not isinstance(item.get('evidence'),str) or not item['evidence'] or item['evidence'] not in s['answers'][i] or not isinstance(item.get('feedback'),str):raise Failure('invalid_summary',502)
                result={'reply':result['reply'],'items':items,'score':sum(x['score'] for x in items)};s['summary']=result
            else:
                # The model sometimes answers an ordinary question with the summary
                # template anyway, and the raw JSON used to reach the chat bubble
                # verbatim. Anything scoring-shaped is stripped down to the prose the
                # player should actually read.
                result={'reply':plain(raw)}
                if kind=='answer':s['answers'].append(answer);s['replies'].append(result['reply']);result['answered']=len(s['answers'])
                else:s['chat'].append({'answer':answer,'reply':result['reply']});result['chatRemaining']=10-len(s['chat'])
            with self.lock:s['requests'][rid]['result']=result
            return result
        except Exception as e:
            code=e.code if isinstance(e,Failure) else 'provider_uncertain' if reserved else 'unavailable'
            with self.lock:
                s['requests'][rid]['error']=code
                if reserved:self.db.execute("UPDATE calls SET status='uncertain' WHERE id=? AND status='reserved'",(key,))
            raise Failure(code,503)
        finally:
            with self.lock:s['busy']=False;s['t']=self.clock()
            self.slots.release()

def handler(g):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def send(self,status,data):
            raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
            origin=self.headers.get('Origin')
            if origin in g.config().get('allowed_origins',[]):self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Vary','Origin')
            self.send_header('Cache-Control','no-store');self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
        def do_OPTIONS(self):
            self.send_response(204)
            if self.headers.get('Origin') in g.config().get('allowed_origins',[]):self.send_header('Access-Control-Allow-Origin',self.headers['Origin'])
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()
        def do_GET(self):self.send(200,g.health()) if self.path=='/api/renzeng/health' else self.send(404,{'error':'route'})
        def do_POST(self):
            try:
                size=int(self.headers.get('Content-Length','0'))
                if size<2 or size>8192:raise Failure('body_size',413)
                p=json.loads(self.rfile.read(size));kind=self.path[len('/api/renzeng/'):] if self.path.startswith('/api/renzeng/') else ''
                if not isinstance(p,dict) or not self.path.startswith('/api/renzeng/'):raise Failure('route',404)
                # Only the loopback reverse proxy sets this; no externally supplied XFF chain.
                ip=self.headers.get('X-Real-IP',self.client_address[0])
                result=g.create(ip) if kind=='sessions' else g.submit(kind,p)
                self.send(200,result)
            except Failure as e:self.send(e.status,{'error':e.code})
            except Exception:self.send(400,{'error':'invalid_request'})
    return Handler

if __name__=='__main__':
    base=Path(__file__).resolve().parent
    gateway=Gateway(os.environ.get('RENZENG_CONFIG','/etc/renzeng/config.json'),os.environ.get('RENZENG_LEDGER','/var/lib/renzeng/ledger.sqlite3'),base/'role.md')
    def cleanup():
        while True:time.sleep(30);gateway.purge()
    threading.Thread(target=cleanup,daemon=True).start()
    ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('RENZENG_PORT','4318'))),handler(gateway)).serve_forever()
