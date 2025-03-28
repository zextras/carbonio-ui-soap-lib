/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

def nodeCmd(String cmd) {
    sh '. load_nvm && nvm install && nvm use && npm ci && ' + cmd
}

def getPackageName() {
    return sh(script: 'grep \'"name":\' package.json | sed -n --regexp-extended \'s/.*"name": "([^"]+).*/\\1/p\' ', returnStdout: true).trim()
}

def getRepositoryName() {
    return sh(script: '''#!/bin/bash
        git remote -v | head -n1 | cut -d$'\t' -f2 | cut -d' ' -f1 | sed -e 's!https://github.com/!!g' -e 's!git@github.com:!!g' -e 's!.git!!g'
    ''', returnStdout: true).trim()
}

def getLastTag() {
    return sh(script: '''#!/bin/bash
        git describe --tags --abbrev=0
    ''', returnStdout: true).trim()
}

void npmLogin(String npmAuthToken) {
    if (!fileExists(file: '.npmrc')) {
        sh(
            script: """
                touch .npmrc;
                echo "//registry.npmjs.org/:_authToken=${npmAuthToken}" > .npmrc
            """,
            returnStdout: false
        )
    }
}

Boolean lcovIsPresent
Boolean isReleaseBranch
Boolean isDevelBranch
Boolean isPullRequest
Boolean isSonarQubeEnabled
String branchName

pipeline {
    agent {
        node {
            label 'nodejs-agent-v4'
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
                stash(
                    includes: ".npmrc",
                    name: ".npmrc"
                )
            }
        }
        stage('Tests') {
            when {
                beforeAgent true
                anyOf {
                    expression { isSonarQubeEnabled == true }
                    expression { isPullRequest == true }
                    expression { isDevelBranch == true }
                }
            }
            parallel {
                stage('Lint') {
                    agent {
                        node {
                            label 'nodejs-agent-v4'
                        }
                    }
                    steps {
                        unstash(name: ".npmrc")
                        nodeCmd('npm run lint')
                    }
                }
                stage('TypeCheck') {
                    agent {
                        node {
                            label "nodejs-agent-v4"
                        }
                    }
                    steps {
                        unstash(name: ".npmrc")
                        nodeCmd('npm run type-check')
                    }
                }
                stage('Unit Tests') {
                    agent {
                        node {
                            label 'nodejs-agent-v4'
                        }
                    }
                    steps {
                        unstash(name: ".npmrc")
                        nodeCmd('npm run test')
                    }
                    post {
                        success {
                            script {
                                if (fileExists('coverage/lcov.info')) {
                                    lcovIsPresent = true
                                    stash(
                                        includes: 'coverage/lcov.info',
                                        name: 'lcov.info'
                                    )
                                }
                            }
                        }
                        always {
                            junit 'junit.xml'
                            recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']])
                        }
                    }
                }
            }
        }

        stage('SonarQube analysis') {
            agent {
                node {
                    label 'nodejs-agent-v4'
                }
            }
            when {
                beforeAgent true
                allOf {
                    expression { isSonarQubeEnabled == true }
                }
            }
            steps {
                script {
                    if (lcovIsPresent) {
                        unstash(name: 'lcov.info')
                    }
                    nodeCmd('npm i -D sonarqube-scanner')
                }
                withSonarQubeEnv(credentialsId: 'sonarqube-user-token', installationName: 'SonarQube instance') {
                    nodeCmd("npx sonar-scanner -Dsonar.projectKey=${getPackageName().replaceAll("@zextras/", "")} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info")
                }
            }
        }

        stage("Build") {
            agent {
                node {
                    label "nodejs-agent-v4"
                }
            }
            steps {
                script {
                    unstash(name: '.npmrc')
                    nodeCmd('npm run build')
                }
            }
        }

        stage('Release') {
            when {
                beforeAgent true
                allOf {
                    expression { isPullRequest == false }
                }
            }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'npm-zextras-bot-auth-token', usernameVariable: 'AUTH_USERNAME', passwordVariable: 'NPM_TOKEN')]) {
                        withCredentials([usernamePassword(credentialsId: 'tarsier-bot-pr-token-github', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
                            nodeCmd("npx semantic-release")
                        }
                    }
                }
            }
        }

        stage('Open release to devel pull request') {
            when {
                beforeAgent true
                allOf {
                    expression { isReleaseBranch == true }
                }
            }
            steps {
                script {
                    String versionBumperBranchName = "version-bumper/${getLastTag()}"
                    sh(script: """#!/bin/bash
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
