import groovy.json.JsonSlurper
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
val releaseInfo = JsonSlurper().parse(rootProject.file("../release.json")) as Map<*, *>
val signing = Properties()
val signingFile = System.getenv("RENZENG_SIGNING_PROPERTIES")?.let { file(it) }
    ?: rootProject.file("keystore.properties")
if (signingFile.exists()) signingFile.reader(Charsets.UTF_8).use { signing.load(it) }
android {
    namespace = releaseInfo["applicationId"] as String
    compileSdk = 36
    buildFeatures { buildConfig = true }
    defaultConfig {
        applicationId = releaseInfo["applicationId"] as String
        minSdk = 26
        targetSdk = 36
        versionCode = (releaseInfo["versionCode"] as Number).toInt()
        versionName = releaseInfo["version"] as String
    }
    signingConfigs {
        if (signingFile.exists()) create("release") {
            storeFile = file(signing.getProperty("storeFile"))
            storePassword = signing.getProperty("storePassword")
            keyAlias = signing.getProperty("keyAlias")
            keyPassword = signing.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isDebuggable = false
            isMinifyEnabled = false
            if (signingFile.exists()) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
}
dependencyLocking { lockAllConfigurations() }
tasks.register<Exec>("prepareGame") {
    workingDir(rootProject.file(".."))
    commandLine("node", "tools/build.cjs")
}
tasks.named("preBuild") { dependsOn("prepareGame") }
