# Use the official Beevelop Ionic image as the base image
FROM beevelop/ionic:v2023.10.1

# Set environment variables for Android SDK and Java
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH

# Install Java 17, curl, unzip, and dependencies
RUN apt update && \
    apt install -y openjdk-17-jdk curl unzip lib32z1 lib32ncurses6 lib32stdc++6 lib32gcc1 && \
    rm -rf /var/lib/apt/lists/*

# Install NVM and Node.js 20
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash && \
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc && \
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc && \
    echo 'nvm install 20 && nvm use 20' >> ~/.bashrc

# Install Gradle 8.5
RUN wget https://services.gradle.org/distributions/gradle-8.5-bin.zip -P /tmp && \
    unzip /tmp/gradle-8.5-bin.zip -d /opt/gradle && \
    echo 'export PATH=/opt/gradle/gradle-8.5/bin:$PATH' >> ~/.bashrc

# Set the default shell as bash
ENTRYPOINT ["bash"]
