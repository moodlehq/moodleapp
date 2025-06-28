# Troubleshooting - Moodle App

Este documento contém soluções para problemas comuns encontrados durante o desenvolvimento e build da aplicação Moodle.

## Build Android

### Problema: Conflitos de Dependências Kotlin

**Erro:**
```
Duplicate class kotlin.collections.jdk8.CollectionsJDK8Kt found in modules
kotlin-stdlib-1.8.22 (org.jetbrains.kotlin:kotlin-stdlib:1.8.22)
kotlin-stdlib-jdk8-1.7.21 (org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.7.21)
```

**Causa:**
Durante o build Android, podem ocorrer conflitos entre diferentes versões das bibliotecas Kotlin, especificamente entre `kotlin-stdlib-jdk7`, `kotlin-stdlib-jdk8` e `kotlin-stdlib`. Isso acontece porque:
- Versões antigas do Kotlin (< 1.8.0) tinham bibliotecas separadas para JDK 7 e 8
- Versões mais recentes (>= 1.8.0) integraram essas funcionalidades no `kotlin-stdlib` principal
- Dependências transitivas podem trazer ambas as versões

**Solução:**

#### 1. Criar o arquivo `platforms/android/app/build-extras.gradle`

```gradle
// Arquivo build-extras.gradle para resolver conflitos de dependências Kotlin
// Este arquivo força a exclusão das bibliotecas antigas kotlin-stdlib-jdk7 e kotlin-stdlib-jdk8
// que já estão incluídas no kotlin-stdlib 1.8.22+

android {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-stdlib:${cordovaConfig.KOTLIN_VERSION}"

            // Força a exclusão das bibliotecas jdk que causam conflito
            eachDependency { details ->
                if (details.requested.group == 'org.jetbrains.kotlin') {
                    if (details.requested.name == 'kotlin-stdlib-jdk7' ||
                        details.requested.name == 'kotlin-stdlib-jdk8') {
                        details.useTarget group: 'org.jetbrains.kotlin', name: 'kotlin-stdlib', version: cordovaConfig.KOTLIN_VERSION
                        details.because 'kotlin-stdlib-jdk7 and kotlin-stdlib-jdk8 are now part of kotlin-stdlib'
                    }
                }
            }
        }

        // Exclui explicitamente as dependências problemáticas
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}

// Configurações adicionais para resolver conflitos
configurations.all {
    resolutionStrategy.eachDependency { DependencyResolveDetails details ->
        def requested = details.requested
        if (requested.group == 'org.jetbrains.kotlin') {
            if (requested.name == 'kotlin-stdlib-jdk7' || requested.name == 'kotlin-stdlib-jdk8') {
                details.useVersion cordovaConfig.KOTLIN_VERSION
                details.because 'Align Kotlin stdlib versions'
            }
        }
    }
}
```

#### 2. Configurar a versão do Kotlin (Opcional)

No arquivo `platforms/android/cdv-gradle-config.json`, você pode atualizar a versão do Kotlin:

```json
{
  "KOTLIN_VERSION": "1.8.22"
}
```

**Nota:** O arquivo `build-extras.gradle` funciona com qualquer versão do Kotlin, incluindo `1.7.21`.

#### 3. Aplicar as correções

1. Adicionar a plataforma Android (se ainda não foi feito):
   ```bash
   ionic cordova platform add android
   ```

2. Criar o arquivo `build-extras.gradle` no caminho correto

3. Limpar o cache do Gradle:
   ```bash
   cd platforms/android && ./gradlew clean
   ```

4. Fazer o build:
   ```bash
   ionic cordova build android --release
   ```

---

## Comandos de Build

### Android

- **Build Release (AAB):** `ionic cordova build android --release`
- **Build Release (APK):** `ionic cordova build android --release -- --packageType=apk`
- **Build Debug:** `ionic cordova build android`

### Limpeza de Cache

Se encontrar problemas de cache ou dependências, execute:

```bash
# Limpar cache do Gradle
cd platforms/android && ./gradlew clean

# Limpar cache do npm
npm cache clean --force

# Reinstalar node_modules
rm -rf node_modules && npm install

# Remover e readicionar plataforma Android
ionic cordova platform rm android
ionic cordova platform add android
```

---

## Problemas Comuns de Desenvolvimento

### Problema: Erro de Memória durante o Build

**Erro:**
```
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:transformClassesWithDexForRelease'.
> com.android.build.api.transform.TransformException: java.util.concurrent.ExecutionException
```

**Solução:**
Aumentar a memória heap do Gradle no arquivo `platforms/android/gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.daemon=true
org.gradle.configureondemand=true
```

### Problema: Plugins não encontrados

**Erro:**
```
Plugin 'cordova-plugin-*' not found
```

**Solução:**
```bash
# Reinstalar plugins
ionic cordova plugin rm [nome-do-plugin]
ionic cordova plugin add [nome-do-plugin]

# Ou reinstalar todos os plugins
rm -rf plugins/
ionic cordova prepare
```

### Problema: Versões incompatíveis do Node.js

**Erro:**
```
Node Sass does not yet support your current environment
```

**Solução:**
1. Verificar a versão do Node.js recomendada no `package.json`
2. Usar nvm para gerenciar versões:
   ```bash
   nvm install [versão-recomendada]
   nvm use [versão-recomendada]
   ```

---

## Requisitos do Sistema

### Para Build Android

- **Node.js:** 20.x (recomendado)
- **Java:** OpenJDK 11 ou 17
- **Gradle:** 8.x
- **Android SDK:** API Level 35
- **Android Build Tools:** 35.0.0+

### Verificação de Requisitos

```bash
# Verificar versões instaladas
node --version
java --version
gradle --version

# Verificar requisitos do Cordova
ionic cordova requirements android
```

---

## Logs e Debugging

### Habilitar logs detalhados

```bash
# Build com logs verbosos
ionic cordova build android --verbose

# Logs do Gradle
cd platforms/android && ./gradlew build --info

# Logs do dispositivo Android
adb logcat
```

### Arquivos de log importantes

- `platforms/android/build/reports/problems/problems-report.html`
- `platforms/android/app/build/outputs/logs/`
- Console do navegador (para debugging web)

---

## Contribuindo com Soluções

Se você encontrar novos problemas e suas soluções, por favor:

1. Documente o erro completo
2. Descreva os passos para reproduzir
3. Forneça a solução testada
4. Adicione a solução a este arquivo via Pull Request

Para mais informações sobre desenvolvimento, consulte a [documentação oficial](https://moodledev.io/general/app).
