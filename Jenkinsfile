/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

def getPackageName() {
    return sh(script: 'grep \'"name":\' package.json | sed -n --regexp-extended \'s/.*"name": "([^"]+).*/\\1/p\' ', returnStdout: true).trim()
}

def getRepositoryName() {
    return sh(script: '''
        git remote -v | head -n1 | cut -d$'\t' -f2 | cut -d' ' -f1 | sed -e 's!https://github.com/!!g' -e 's!git@github.com:!!g' -e 's!.git!!g'
    ''', returnStdout: true).trim()
}

def getLastTag() {
    return sh(script: '''
        git describe --tags --abbrev=0
    ''', returnStdout: true).trim()
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
                script {
                    isReleaseBranch = "${BRANCH_NAME}" ==~ /release/
                    echo "isReleaseBranch: ${isReleaseBranch}"
                    isDevelBranch = "${BRANCH_NAME}" ==~ /devel/
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
                        sh 'npm ci'
                    }
                }
            }
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
                            sh 'npm run prettify:check'
                        }
                    }
                }
                stage('Lint') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'npm run lint'
                        }
                    }
                }
                stage('TypeCheck') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'npm run type-check'
                        }
                    }
                }
                stage('Unit Tests') {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            sh 'npm run test'
                        }
                    }
                    post {
                        always {
                            junit 'junit.xml'
                            recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']])
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
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Release') {
            when {
                allOf {
                    expression { isPullRequest == false }
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        withCredentials([usernamePassword(credentialsId: 'npm-zextras-bot-auth-token', usernameVariable: 'AUTH_USERNAME', passwordVariable: 'NPM_TOKEN')]) {
                            withCredentials([usernamePassword(credentialsId: 'tarsier-bot-pr-token-github', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
                                sh "npx semantic-release"
                            }
                        }
                    }
                }
            }
        }

        stage('Open release to devel pull request') {
            when {
                allOf {
                    expression { isReleaseBranch == true }
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        String versionBumperBranchName = "version-bumper/${getLastTag()}"
                        sh(script: """
                            git push origin HEAD:refs/heads/${versionBumperBranchName}
                        """)
                        withCredentials([usernamePassword(credentialsId: 'tarsier-bot-pr-token-github', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
                            sh(script: """
                                curl https://api.github.com/repos/${getRepositoryName()}/pulls \
                                -X POST \
                                -H 'Accept: application/vnd.github.v3+json' \
                                -H 'Authorization: token ${GH_TOKEN}' \
                                -d '{
                                    \"title\": \"chore(release): ${getLastTag()}\",
                                    \"head\": \"${versionBumperBranchName}\",
                                    \"base\": \"devel\",
                                    \"maintainer_can_modify\": true
                                }'
                            """)
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
            emailext (
                attachLog: true,
                body: '$DEFAULT_CONTENT',
                recipientProviders: [requestor()],
                subject: '$DEFAULT_SUBJECT',
                to: "${commitEmail}"
            )
        }
    }
}
