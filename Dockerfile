
FROM node:12
WORKDIR /usr/src/app

RUN apt update
RUN apt install -y wget

COPY package*.json ./
RUN npm install

RUN wget https://github.com/KanjiVG/kanjivg/releases/download/r20160426/kanjivg-20160426-all.zip && unzip kanjivg-20160426-all.zip && rm kanjivg-20160426-all.zip
RUN wget https://raw.githubusercontent.com/libhangul/libhangul/master/data/hanja/hanja.txt

COPY . .

CMD ["npm", "start"]