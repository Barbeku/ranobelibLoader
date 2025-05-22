"use strict";

const fs = require("fs");
const https = require("https");
const childProcess = require("child_process");
const path = require("path");

var name = "38728--supreme-magus"
console.log(name)

var normName;
var ranobeName;
var coverUrl;
var description;
//var name = "81842--vampire-overlord-system-in-the-apocalypse";
var chaptersAmount;

var chaptersUrl = [];
var chapters = [];
var chapterNames = [];

const log = console.log;

let i = 0;

main();
async function main(){
  await getMainData();
  await getChaptersAmount();
  await fetchContent();
  await endFetch();
}

async function getMainData(){
  await fetch(`https://api.lib.social/api/manga/${name}?fields[]=summary`)
    .then(res => res.json())
    .then(data => {
      normName = data.data.name;
      ranobeName = data.data.slug;
      coverUrl = data.data.cover.default;
      description = data.data.summary;
    })
}

let chaptersPos = 1;
async function getChaptersAmount(){
  await fetch(`https://api.lib.social/api/manga/${name}/chapters`)
    .then(res => res.json())
    .then(data => {
      data.data.forEach(i => {
        chaptersUrl.push(`https://api.lib.social/api/manga/${name}/chapter?number=${i.number}&volume=${i.volume}`);
      })
      chaptersAmount = chaptersUrl.length;
    })
}

function toParagraph(text){
  return '<p>' + text + '</p>';
}

let count = 0;
function fetchContent(){
  const url = chaptersUrl[i]; 
  console.log(url)
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      if(typeof data.data.content === 'string'){
        chapters.push(data.data.content);
      }
      else{
        chapters.push(
          data.data.content.content.map(i => {
            if(i?.content)
              return toParagraph(i.content[0].text);
            return           
          }).reduce((t, i) => t + i)
        );
      }
      chapterNames.push(String(count++) + ". " + data?.data?.name);

      i += 1;
      if(i >= chaptersAmount) return;
      else return fetchContent();
    })
    .catch(() => {
      log("error");
      return fetchContent()
    })
}

const f=()=>null;

//  var file = fs.createWriteStream(');
async function saveCover(){
  return new Promise((resolve, reject) => {
    https.get(coverUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Ошибка HTTP: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream('./novel/OPS/images/cover.jpg');
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve('Изображение успешно загружено и сохранено как image.png');
      });
    })
  });
}


async function endFetch(){
  await fs.cpSync("./example", `./novel`, { recursive: true })
 
  chapters.forEach(async (item, index) => {
    await fs.appendFileSync(
      `./novel/OPS/chapter-1-${index+1}.xhtml`,
      getChapterStart(chapterNames[index]) + item + defaultChapterEnd,
      ()=>null
    )
  })

  var ncxContent = await fs.readFileSync(`./example/OPS/book.ncx`, {encoding: "utf8", flag: "r"});
  var opfContent = await fs.readFileSync(`./example/OPS/book.opf`, {encoding: "utf8", flag: "r"});

  await fs.writeFileSync(
    `./novel/OPS/book.ncx`,
    getNcxContent(ncxContent, chapterNames),
    { encoding: "utf8", flag: "w"}, f
  );

  await fs.writeFileSync(
    `./novel/OPS/book.opf`,
    getOpfContent(opfContent, chapterNames.length),
    { encoding: "utf8", flag: "w"}, f
  );

  await fs.appendFileSync(`./novel/OPS/toc.xhtml`, getTocContent(chapterNames), ()=>null)

  var pathToDir = `${__dirname}\\novel`

  console.log(1)
  saveCover().then(() => {
    childProcess.execSync(`cd ${pathToDir} && zip -r -m novel . && move ./novel.zip ./${ranobeName}.epub`);
  })
}

function getNcxContent(ncxContent, chapterNames){
  var content = "";

  for(var i = 0; i < chapterNames.length; i++){
    content += `<navPoint id="chapter${i+3}" playOrder="${i+3}">
      <navLabel>
        <text>${chapterNames[i]}</text>
      </navLabel>
      <content src="chapter-1-${i+1}.xhtml" />
    </navPoint>`
  }

  return ncxContent.replace("TitleName", normName).replace("ContentNcx", content);
}

function getOpfContent(opfContent, length){
  var chaptersContent = "";
  var itemrefContent = "";

  for(var i = 0; i < length; i++)
    chaptersContent += `<item id="chapter${i+3}" href="chapter-1-${i+1}.xhtml" media-type="application/xhtml+xml" />`;

  for(var i = 0; i < length+2; i++)
    itemrefContent += `<itemref idref="chapter${i+1}" />`;

  return opfContent
          .replace("TitleName", normName)
          .replace("TitleDescription", description)
          .replace("ChaptersContent", chaptersContent)
          .replace("ItemrefContent", itemrefContent)
}

function getTocContent(chapterNames){
  var content = "";
  for(var i = 0; i < chapterNames.length; i++)
    content += `<li class='level1'><a href="chapter-1-${i+1}">${chapterNames[i]}</a></li>`
  content += defaultTocEnd;

  return content;
}

function getChapterStart(chapterName){
  return `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"> <head><meta http-equiv="Default-Style" content="text/html; charset=utf-8"/> <title>Test Book</title></head><body><h2>${chapterName}</h2>`;
}

const defaultTocEnd = `</ol></nav></body></html>`
const defaultChapterEnd = `</body></html>`;
