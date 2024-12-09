"use strict";

const fs = require("fs");
const https = require("https");
const childProcess = require("child_process");
const path = require("path");

var normName;
var ranobeName;
var coverUrl;
var description;
var name = "89042--the-crimson-dragon";
var chaptersAmount;

var chapters = [];
var chapterNames = [];

const log = console.log;

let i = 0;

main();
async function main(){
  await getMainData();
  await getChaptersAmount();
  fetchContent();
}

function saveCover(url){
  var file = fs.createWriteStream(`./${ranobeName}/OPS/images/cover.jpg`);
  return new Promise((response, rej) => {
    https.get(url, async (res) => {
      await res.pipe(file);
      await response();
    })
  });
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

async function getChaptersAmount(){
  await fetch(`https://api.lib.social/api/manga/${name}/chapters`)
    .then(res => res.json())
    .then(data => {
      chaptersAmount = data.data.length;
    })
}

function toParagraph(text){
  return '<p>' + text + '</p>';
}

function fetchContent(){
  const url = `https://api.lib.social/api/manga/${name}/chapter?number=${i}&volume=1`;
  console.log(url)
  fetch(url)
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
            return "";
          }).reduce((t, i) => t + i)
        );
      }
      chapterNames.push(data?.data?.name);

      if(i >= chaptersAmount) return endFetch();
      else fetchContent();
    })
  i += 1;
}

const f=()=>null;

async function endFetch(){
  fs.cpSync("./example", `./${ranobeName}`, { recursive: true })
 
  chapters.forEach((item, index) => {
    fs.appendFile(
      `./${ranobeName}/OPS/chapter-1-${index+1}.xhtml`,
      getChapterStart(chapterNames[index]) + item + defaultChapterEnd,
      ()=>null
    )
  })


  var ncxContent = fs.readFileSync(`./example/OPS/book.ncx`, {encoding: "utf8", flag: "r"});
  var opfContent = fs.readFileSync(`./example/OPS/book.opf`, {encoding: "utf8", flag: "r"});

  fs.writeFile(
    `./${ranobeName}/OPS/book.ncx`,
    getNcxContent(ncxContent, chapterNames),
    { encoding: "utf8", flag: "w"},
    f
  );

  fs.writeFile(
    `./${ranobeName}/OPS/book.opf`,
    getOpfContent(opfContent, chapterNames.length),
    { encoding: "utf8", flag: "w"},
    f
  );

  fs.appendFile(`./${ranobeName}/OPS/toc.xhtml`, getTocContent(chapterNames), ()=>null);


  var pathToDir = `${__dirname}\\${ranobeName}`

  await saveCover(coverUrl)
  await childProcess.execSync(`cd ${pathToDir} && zip -r -m ${ranobeName} . && move ./${ranobeName}.zip ./${ranobeName}.epub`);
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
