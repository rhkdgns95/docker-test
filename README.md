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
        - docker build -t react-app:0.1 -f Dockerfile.prev .
      
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
        - travis에서 docker run을 실행시킬때는 항상 <container_id>가 맨뒤에 있어야하며, --name옵션을 줄 수 없다.
        - docker run 
  - 4. 해당 소스를 git repository에 커밋하고 push한다.
    - ```bash
      git 