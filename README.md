# Docker React환경 배포


## 설명
## Chapter 1
```Dockerfile
FROM node:alpine

WORKDIR /app

COPY package.json .
RUN npm install
COPY . .

CMD [ "npm", "run", "start"]
```

- volumn
  - 우리가 소스를 변경하게되면 어떻게 될까?
  - 컨테이너는 우리 소스파일의 스냅샷을 가져간다.
  - 따라서 소스가 바뀔때마다 항상 새로 build를 한다면 정말 귀찮을것이다.
  - 그래서 소스코드를 컨테이너 안에 mount시킬것이다. 
  - 즉, 컨테이너 안의 코드가 우리의 로컬 소스코드를 reference 하도록 해주는 것이다.

- volumn 실행 방법
  - 1. Docker CLI 사용하기
    - ```json
      docker run -p 3000:3000
       -v /app/node_modules    // node_modules 폴더에 bookmark를 둔다. 즉, 해당 폴더는 맵핑을 시키지 않을것.
       -v $(pwd):/app     // 현재 경로(pwd)에 있는 파일들을 container의 app에 모두 맵핑시킨다.
       <image_id>
    - 위의 설명은 -v $(pwd):/app는 : 이 들어가있고 -v /app/node_modules는 들어가 있지 않은것을 확인.
    - :이 들어가있으면 해당 경로의 파일들을 Mapping 즉 mount한다는 것이고 :이 없으면 해당 폴더를 제외하는 것이다.
    - 이를 종합해보면 아래와 같다.
    - ```bash
      docker run -p 3000:3000 -v /app/node_modules -v $(pwd):/app <image id>
    - 이와같이 node_modules를 제외하는 이유는 프로젝트 내의 node_modules폴더를 삭제했기 때문이다.
    - node_modules폴더를 삭제하여 해당 폴더는 비어있는데, /app폴더가 mapping을 하면 npm install을 하고나서도
      node_modules은 남아있지 않기 때문이다. 따라서 node_modules폴더는 맵핑을 제외 시켜야 함.
  - 2. docker-compose 사용하기.
    - docker compose.yml
    - ```yml
      version: "3"
      service: 
        web:
          build:
            context: .
            dockerfile: Dockerfile.dev
          ports: 
            - "3000:3000"
          volumes:
            - /app/node_modules
            - .:/app
    - 이후 아래 명령어를 실행시키면, 소스코드가 바뀔때마다 자동적으로 컨테이너 안의 소스코드도 바뀌는것을 확인.
    - ```bash
      docker-compose up --build

## Chapter 2
- npm run test를 동작시켜 해당 프로젝트를 test해보자.
- ```bash
  docker build -f Dockerfile.dev .
  docker run -it [image_id] 
- 해당 명령어를 실행시키면 test소스코드가 바뀔때마다 소스코드는 실행이 안되는것을 볼 수 있다.
- 이 역시 해당 명령어로 build된 container는 이전의 파일 스냅샷만 갖고있기 때문이다.
- 이를 해결하기 위한 다음 2가지 방법이 있음.
  - 1) attach 이용하기.
    - 터미널 1
    - ```bash
      docker-compose up
    - 터미널 2
    - ```bash
      docker exec -it [contianer_id] npm run test
  - 2) docker-compose.yml에 해당 소스 추가하기.
    - ```yml
      version: "3"
      service:
        web: 
          build: 
            context: .
            dockerfile: Dockerfile.dev
          ports:
            - "3000:3000"
          volumes:
            - /app/node_modules
            - .:/app
        tests: 
          build:
            context: .
            dockerfile: Dockerfile.dev
          volumes: 
            - /app/node_modules
            - .:/app
          command: ["npm", "run", "test"]
    - docker-compose.yml 파일의 service에 test를 추가.
    - 이후 다음 명령어를 실행
    - ```bash
      docker-compose up --build
    - 이제 소스코드가 바뀔때마다 자동적으로 컨테이너 안의 소스코드도 바뀌는것을 확인할 수 있다.
    - 하지만, 이렇게하면 terminal에 아무것도 입력할 수 없다.
- 이제 production을 위한 docker컨테이너를 생성해보자.
  - 개발서버와 운영서버는 다른 서버가 필요하다
  - 운영서버에서는 nginx를 사용하여 운영한다.
  - 따라서 다음과 같이 dockerfile을 작성해야한다.
  - ```
    1. baseimage로 node:alpine을 사용.
    2. package.json 파일을 복사.
    3. dependencies들을 설치.
    4. npm run build를 이용해 프로젝트를 deploy하기 위해 build해줌.
    5. nginx를 시작.
  - 여기서 주목해야할 것은 3번과 5번이다.
  - 3번 단계에서는 설치된 `dependencies들은 npm run build를 하기 위해 필요한 파일들`이다.
  - 운영환경에서 우리가 필요한 건 오로지 build한 내용이 담겨있는 build폴더내의 파일들이다.
  - 따라서 운영 컨테이너는 다른 개발 파일들이 필요없고, 해당 build폴더내의 파일들만 가지고 있으면 됨.
  - 그리고 5단계는 어떻게 실행할까?
  - 다음과 같은 단계를 거침.
  - ```
    # Build Phase
      1. node:alpine을 base image로 사용
      2. package.json파일 복사
      3. dependencies들 설치
      4. npm run build 실행

    # Run Phase
      1. nginx를 base image로 사용
      2. build phase의 4단계에서 생성된 build폴더의 내용을 복사
      3. nginx 실행
  - 해당 단계를 실행시키기 위한 Dockerfile은 다음과 같다.
  - ```Dockerfile
    FROM node:alpine as builder
    WORKDIR '/app'
    COPY package.json .
    RUN npm install
    COPY . .
    RUN npm run build

    FROM nginx
    COPY --from=builder /app/build /usr/share/nginx/html
  - 이제 다음 명령어로 해당파일의 이미지를 만들고 컨테이너를 실행시킬 수 있다.
  - ```bash
    docker build -t react-app-prod -f Dockerfile.dev
    docker run -p 8080:80 --name my-react-app-prod react-app-prod
  - 이제 운영서버로 배포완료.

## Chapter3
- Travis CI를 통해 git에 푸시한 코드를 자동으로 테스트하고 aws에 push하기
  - 1. git에 새로운 프로젝트 생성 후, git remote repository를 연결.
  - 2. travis공식 사이트에서 dashboard로 이동 후, 생성한 git의 레포지터리를 선택.
    - 이제 새로운 소스가 github에 push될 때마다 travis는 자동으로 해당소스를 가져와 우리가 만든 로직대로 테스트하고 AWS에 해당소스를 push해 줄 것이다.
  - 3. 프로젝트 폴더로 돌아와 root경로에 새로운파일 .travis.yml을 생성.
    - ```yml
      sudo: required
      services:
        - docker
      
      before_install:
        - docker build -t react-app:0.1 -f Dockerfile.dev .
      
      script:
        - docker run react-app:0.1 --name react-app-0.1 npm run test:unit -- --coverage
    - ```
      3-1) sudo: required
        - 다음 명령어는 아래의 명령어를 실행시킬 때 sudo의 권한을 요구한다.
      3-2) services
        - 실행되고 있는 docker의 copy를 가져온다는 의미이다.
      3-3) before_install
        - script(테스트 로직)이 실행되기 전 설치되어야 할 파일등를 의미한다.
        - 참고로 아래 sscript파일에 실행시킬 image_id가 필요한데, 
          해당 파일에 저장된 명령어들은 우리 대신 모두 travis가 실행시킨다는 것이다.
        - 따라서 우리는 구체적은 image_id를 알 수 없다. 
        - 그러므로 생성된 이미지에 태그를 걸어두어(-t 옵션) 생성된 이미지를 실행시키도록 하자.
      3-4) script
        - 테스트를 진행하기 위한 명령어를 적는곳이다.
        - travis는 해당 테스트를 진행한 후의 결과코드를 얻어야 한다.
        - 하지만 "$ docker run react-app:0.1 --name react-app-0.1 npm run test:unit"까지만 실행하면,
          해당 명령어는 테스트를 진행하고 끝나지 않고 계속 해당 프로세스에 머물러 있을것이다.
        - 따라서 뒤에 -- --coverage 옵션을 추가해주어야 함.
      3-5) 정정!
        - docker파일은 npm run test:unit의 명령어가 들어가있는 Dockerfile.dev으로 올려야 함.
        - travis에서 docker run을 실행시킬때는 항상 <container_id>가 맨뒤에 있어야하며, --name과 같은 여러 옵션들은 항상 <container_id>앞에 작성해주도록 해야함.
        - docker run react-app:0.1 npm run test:unit -- --coverage와 같이 수정해야 함!
      3-6) 정정 
  - 4. 해당 소스를 git repository에 커밋하고 push한다.
    - ```bash
      git add .
      git commit -m ""
      git push origin XXX
  - 5. 이제 travis사이트에서 확인이 가능함.

## Chapter 4
- AWS계정에 들어가 Elastic Beanstalk를 생성
  - 기본 구성 플렛폼: Docker
  - 앱 코드: 샘플 애플리케이션
- .travis.yml파일 작성
  - ```yml
    services: 
      - docker
    
    before_install:
      - docker build -t react-app:0.1 -f Dockerfile.dev .
    
    script:
      - docker run --name react-app-0.1 react-app:0.1 npm run test:unit -- --coverage
    
    deploy:
      provider: elasticbeanstalk
      region: "ap-northeast-2"
      app: "docker-testing"
      env: "DockerTesting-env"
      bucket_name: ""
      bucket-path: "docker-testing"
      on:
        branch: master
      access_key_id: $AWS_ACCESS_KEY
      secret_access_key:
        secure: $AWS_SECRET_KEY
    - buckey명은 S3를 검색하면 나옴.
    - access_key생성방법
      - IAM에서 USERS클릭
      - ADD User
      - Username 입력 -> Access type은 Programmatic access를 선택 후 next클릭
      - Set Permission메뉴 중 Attach existing policies directly 메뉴 클릭
      - 검색창 beanstalk검색
      - Description에 Provices full access to AWS Elastic Beanstalk의 권한 선택 후 next
      - Create User클릭
      - 이제 해당정보는 한번만 볼 수 있고 다음부터는 확인 및 접근 불가.
      - 접근 key 생성완료 후 travis에서 more options에 settings를 클릭.
      - AWS_ACCESS_KEY/AWS_SECRET_KEY를 작성.

# Github Actions를 이용

### Chpater 1
- 용어정리
  - Workflow
    - 프로젝트를 빌드, 테스트, 패키지, 릴리즈 또는 배포하기 위한 전체적인 프로세스.
    - 워크플로우는 여러개의 job으로 구성되며 event(on)에 의해 실행됨.
  - Job
    - Job은 하나의 인스턴스(리눅스, 맥, 윈도우 등등)에서 여러 Step을 그룹시켜서 실행하는 역할.
  - Step
    - Step은 순차적으로 명령어를 수행함.
    - 크게 Uses와 Run으로 작업단위가 나뉨.
    - uses: 이미 다른사람들이 정의한 명령어를 가져와 실행하는 것.
    - run: `npm install`이나 `mkdir example`과 같이 가상환경 내에서 실행할 수 있는 스크립트를 의미.
  - Event
    - 워크플로우를 실행시키는 조건을 설정.
    - 예를들어, 해당 레포지토리에 Code가 push됐을때만, 또는 풀리퀘스트를 했을때, 또는 master branch에 변경사항이 있었을 때 등으로 조건을 줄 수 있다.
    - 물론 cron처럼 주기적으로 스케줄링하는 방법 또한 지원을 해줌.
- Workflow 설정하기
  - github action은 레포지터리에 .github/workflows 폴더안에 yml설정파일이 있으면 활성화 됨.
  - 생성해주면됨. .github/workflows/main.yml
  - ```yml
     name: my workflow
     on: [push]

     jobs: 
       build: 
         name: hello github action
         runs-on: ubuntu-18.04
         steps:
           - name: checkout source code
             uses: actions/checkout@master

           - name: echo Hello
             run: echo "Hello"
  - `step`마다 위와같이 `name`을 설정하고, 실행단위를 정하여 코드를 작성.
  - `uses`는 외부에 이미 만들어진 코드를 가져와서 실행하는 것.
  - 실행 후 커밋 푸시를하면, Github Action에 생성이되어있다.
  - 우리가 workflow파일을 commit해서 push할때, 그 `push`이벤트를 감지하여 workflow가 job을 실행한것이다.
  
### Chapter 2
- 리엑트 프로젝트의 의존파일(node_modules)들을 다운받아 build하는 과정을 알아보자.
- npm run build -> build폴더안에 있는 파일들을 모두 `S3에 올리는 자동화 과정`을 살펴보자
- Workflow 구성
  - 새로운 main.yml을 작성하기.
  - ```yml
    name: React build
    on: 
      push: 
        branches:
          - master
    
    jobs:
      build:
        runs-on: ubuntu-18.04
        steps:
          - name: Checkout source code.
            uses: action/checkout@master
          
          - name: Install Dependencies
            run: npm install
          
          - name: Build
            run: npm run build
  - `Checkout source code`는 이전처럼 레포지터리 파일을 받아오는 것.
  - 그 후에 node_modules 의존 모듈을 받아오기 위해서 `npm install`을 하고, `npm run build`로 빌드하여 정적 파일 들을 생성함.
  - actions탭에서 빌드과정을 확인.
  - 빌드 시간을 단축하기 위해서 Github Action에서는 파일을 Caching하는 방법이 존재함.
  - 폴더마다 400MB까지 캐싱할 수 있으므로 node_modules폴더를 캐싱하는데에는 충분함.
- 폴더 캐싱하기
  - Github Action에서 캐싱을 해보기
  - ```yml
    # ... 아래 추가 Cache node modules를 추가.
    steps:
      - name: Cache node modules
        uses: actions/cache@v1
        with:
          path: ${{ runner.OS }}-build-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.OS }}-build-
            ${{ runner.OS }}-
  - 이는 actions/cache 액션을 가져와 실행함.
  - with구문으로 설정할 수 있는데, `path`와 `key`를 반드시 설정해주어야 함.
    - path: 저장하고 불러올 캐시 대상 폴더
    - key: 저장하고 불러올 때, 식별할 수 있는 키 값
    - restore-keys(optional): 캐시 key가 일치하는 것이 없을때, 차선택으로 캐싱폴더를 찾는 key
  - 알고리즘은 다음과 같다.
    - 1) 이미 캐싱이 된 key값이 존재하면, 해당폴더를 path폴더에 불러옴.
    - 2) 만약 캐싱이 된 key가 없다면, 다음과 같은 작업을 순차적으로 수행함.
      - 2-1) restore-key가 존재한다면, 순서대로 restore-key와 match되는 key값을 찾는다.
      - 2-2) 일치하는 key값이 있다면, push폴더에 불러옴.
      - 2-3) 만약 여기서도 일치하는 key값이 없다면 종료하고 다음단계를 수행함.
    - 3) 해당 job을 성공적으로 마치면, path폴더에 key값을 부여하고 캐싱 후 저장.
  - 위의 코드를 예시로 설명 
    - path
      - node_modules의 폴더를 캐싱.
    - key
      - runner.OS는 가상환경을 의미하며, 여기서는 "Linux"를 의미함.
      - hasFiles('**/package-lock.json')는 package-lock.json파일을 해시화한다는 것인데, 이는 같은의존성 파일이면, 같은 해시값이 나오게되어 새로운 key를 만들지 않는다. 
      - 하지만, 새로운 모듈이 추가되면, lock파일도 변경이 일어나고, 이어서 해시값도 바뀌므로 key도 변경이되어 새롭게 캐싱을 하게됨.
      - restore-keys는 만약 key값이 없으면, 그 이전에 캐시했던 폴더 중 가장 최근의 key값을 가져와 불러옴.
      - 쉽게 말하면 `node_modules`를 저장했다 불러온 것임.
  - 이제 한번더 실행시키면, 이전에 캐싱의 결과로 `Cache not found for ...`이 뜨지만, 
  
### Chapter 3
- 정적 웹사이트 S3생성
  - `모든 퍼블릭 엑세스 차단`을 해제.
  - 정적 `웹 사이트 호스팅` 카드를 누른 뒤 호스팅 설정하기.
    - 인덱스문서와 오류문서에 index.html을 적어주고 저장버튼 클릭.
  - 다음의 버킷 엑세스정책 설정.
    - ```json
      {
        "Version": "2012-10-17",
        "Id": "Policy1546336529826",
        "Statement": [
          {
              "Sid": "Stmt1546336528005",
              "Effect": "Allow",
              "Principal": "*",
              "Action": "s3:GetObject",
              "Resource": "arn:aws:s3:::github-action-testing/*" // 자신의 버킷 이름으로 변경.
          }
        ]
      }
  - 이제 호스팅을 위한 버킷설정은 끝남.

- AWS CLI 권한 생성
  - 터미널 CLI로 버킷에 접근하기 위한 권한을 부여하는 방법을 알아보기.
  - AWS Console에서 IAM 서비스 탭에서 기존정책직접연결에서 S3검색 후 AmazonS3FullAccess를 선택.

### Chapter 4
- Github Action에 민감한 정보 저장하기.
  - AWS CLI Key는 외부에 노출되어서는 안됨.
  - 하지만 우리의 레포지터리는 공개 레포지토리이기 때문에, 업로드하는 파일은 누구에게나 알려지게 됨.
  - 따라서 민감한 정보는 따로 암호화하여 저장할 수 있도록 Github Action에서 방법을 제공한다.
  - 바로 Secrets를 통해서(Git Repository에서의 Settings에서 Secrets클릭) 관리됨.
    - AWS_ACCESS_KEY_ID에 값을 넣었다면, process.env.AWS_ACCESS_KEY_ID와 같이 사용됨.
  - AWS_ACCESS_KEY, AWS_SECRET_KEY를 생성해주자.
- Github Action에서 S3업로드하기.
  - Secrets 정보를 불러와 코드를 작성해보자.
  - ```yml
    name: React build
    on: 
      push: 
        branches:
          - master
    
    jobs:
      build:
        runs-on: ubuntu-18.04
        steps:
          - name: Checkout source code.   # 레포지터리 체크아웃
            uses: actions/checkout@master
          
          - name: Cache node modules      # node_modules 캐싱
            uses: actions/cache@v1
            with: 
              path: node_modules
              key: ${{ runner.OS }}-build-${{ hashFiles('**/package-lock.json') }}
              restore-keys: |
                ${{ runner.OS }}-build-
                ${{ runner.OS }}-
          
          - name: Install depencencies    # 의존성 파일 설치
            run: npm install
          
          - name: Build                   # React Build
            run: npm run build

          - name: Deploy                  # S3에 배포하기.
            env:
              AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
              AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            run: |
              aws s3 cp \
                --recursive
                --region ap-northeast-2 \
                build s3://docker-test 
  - 맨 하단에 Deploy `step`을  추가하였다.
  - porcess.env환경에는 해당정보를 주입한다.
  - secrets객체 안에는 우리가 settings에 설정한 Key-value형태로 저장이 됨.
  - 그 다음 run방식으로 `aws s3 cp`로 위 스텝에서 빌드한 `build`폴더의 내용을 s3://docker-test에 복사함.
  - build s3://docker-test의 버킷이름은 `자신의 버킷`으로 변경하기.
    - S3버킷생성 시 `버킷 정책`에서 작성된 내용의 버킷을 적으면 됨.
  - aws명령어를 사용할수있는 이유는 github action에서 가상환경 구축 시 자동으로 설치되어 있음.
  - 배포 확인.


### 장부다 github actions 진행순서
* 진행순서[공통]
  - [0] 레포지터리 체크아웃
  - [1] 캐싱 사용 node_modules
  - [2] npm 의존성 설치
  - [3] 테스트

* Production
  - [4] npm run prod
  - [5] 도커 이미지 생성
  - [6] Push 도커 이미지

* Dev
  - [4] npm run dev
  - [5] 도커 이미지 생성
  - [6] Push 도커 이미지

