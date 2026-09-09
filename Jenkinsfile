/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

def getPackageName() {
    return sh(script: 'grep \'"name":\' package.json | sed -n --regexp-extended \'s/.*"name": "([^"]+).*/\\1/p\' ', returnStdout: true).trim()
}

def getNodeVersion() {
    return sh(
        script: 'sed "s/^[vV]//" .nvmrc | cut -d. -f1',
        returnStdout: true
    ).trim()
}

void npmLogin(String npmAuthToken) {
    if (!fileExists(file: '.npmrc')) {
        sh(
            script: """
                echo "//registry.npmjs.org/:_authToken=${npmAuthToken}" >> .npmrc
            """,
            returnStdout: false
        )
    }
}

Boolean isReleaseBranch
Boolean isDevelBranch
Boolean isPullRequest
Boolean isSonarQubeEnabled
String branchName
String nodeVersion

library(
    identifier: 'jenkins-lib-common@v4.10.7',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        credentialsId: 'jenkins-integration-with-github-account',
        remote: 'git@github.com:zextras/jenkins-lib-common.git',
    ])
)

properties(defaultPipelineProperties())

pipeline {
    agent {
        node {
            label 'nodejs-v1'
        }
    }
    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '50'))
    }
    parameters {
        booleanParam defaultValue: true, description: 'Enable SonarQube Stage', name: 'RUN_SONARQUBE'
    }
    stages {
        stage("Read settings") {
            steps {
                container('base') {
                    script {
                        gitMetadata()
                        isReleaseBranch = "${BRANCH_NAME}" ==~ /release/
                        echo "isReleaseBranch: ${isReleaseBranch}"
                        isDevelBranch = env.BRANCH_IS_PRIMARY == 'true'
                        echo "isDevelBranch: ${isDevelBranch}"
                        isPullRequest = "${BRANCH_NAME}" ==~ /PR-\d+/
                        echo "isPullRequest: ${isPullRequest}"
                        isSonarQubeEnabled = params.RUN_SONARQUBE == true
                        echo "isSonarQubeEnabled: ${isSonarQubeEnabled}"
                        branchName = env.CHANGE_BRANCH
                        echo "branchName: ${branchName}"
                        nodeVersion = getNodeVersion()
                        echo "NodeJS Major Version: $nodeVersion"
                    }
                }
                container('nodejs-' + nodeVersion) {
                    script {
                        sh 'corepack enable'
                    }
                }
                withCredentials([
                    usernamePassword(
                        credentialsId: "npm-zextras-bot-auth-token",
                        usernameVariable: "NPM_USERNAME",
                        passwordVariable: "NPM_PASSWORD"
                    )
                ]) {
                    script {
                        npmLogin(NPM_PASSWORD)
                    }
                }
            }
        }
        stage('Install dependencies') {
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        sh 'pnpm install --frozen-lockfile'
                    }
                }
            }
        }
        stage('Security Scan') {
            steps { gitleaksStage() }
        }
        stage('Tests') {
            when {
                anyOf {
                    expression { isSonarQubeEnabled == true }
                    expression { isPullRequest == true }
                    expression { isDevelBranch == true }
                }
            }
            parallel {
                stage('Prettify') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'pnpm run prettify:check'
                        }
                    }
                }
                stage('Lint') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'pnpm run lint'
                        }
                    }
                }
                stage('TypeCheck') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'pnpm run type-check'
                        }
                    }
                }
                stage('Unit Tests') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'pnpm run test:ci'
                        }
                    }
                    post {
                        always {
                            container('nodejs-' + nodeVersion) {
                                junit 'junit.xml'
                                recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']])
                            }
                        }
                    }
                }
            }
        }
        stage('SonarQube analysis') {
            when {
                allOf {
                    expression { isSonarQubeEnabled == true }
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    withSonarQubeEnv(credentialsId: 'sonarqube-user-token', installationName: 'SonarQube instance') {
                        sh "npx sonar-scanner -Dsonar.projectKey=${getPackageName().replaceAll("@zextras/", "")} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
                    }
                }
            }
        }
        stage("Build") {
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        sh 'pnpm run build'
                    }
                }
            }
        }
        stage('Release') {
            when {
                anyOf {
                    branch 'release'
                    expression { env.BRANCH_IS_PRIMARY == 'true' }
                    branch 'beta'
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        withCredentials([usernamePassword(credentialsId: 'npm-zextras-bot-auth-token', usernameVariable: 'AUTH_USERNAME', passwordVariable: 'NPM_TOKEN')]) {
                            withCredentials([usernamePassword(credentialsId: 'jenkins-integration-with-github-account', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
                                sh "pnpm exec semantic-release"
                            }
                        }
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                commitEmail = sh(
                    script: 'git --no-pager show -s --format=\'%ae\'',
                    returnStdout: true
                ).trim()
            }
            emailext(
                attachLog: true,
                body: '$DEFAULT_CONTENT',
                recipientProviders: [requestor()],
                subject: '$DEFAULT_SUBJECT',
                to: "${commitEmail}"
            )
        }
    }
}

