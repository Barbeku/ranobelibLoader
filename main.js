"use strict";

const fs = require("fs");

//let name = "83851--white-dragon-lord";
var ranobeName = "the_creature"
var name = "205424--the-creature"
var chaptersAmount = 20;

var chapters = [];
var chapterNames = [];

const log = console.log;

let i = 0;

fetchContent();

function toParagraph(text){
  return '<p>' + text + '</p>';
}

function fetchContent(){
  i += 1;
  const url = `https://api.lib.social/api/manga/${name}/chapter?number=${i}&volume=1`;
  console.log(url)
  fetch(url)
    .then(res => res.json())
    .then(data => {
      chapters.push(
        data.data.content.content.map(i => {
          if(i?.content)
            return toParagraph(i.content[0].text);
          return "";
        }).reduce((t, i) => t + i)
      );
      chapterNames.push(data?.data?.name);

      if(i >= chaptersAmount) return endFetch();
      else fetchContent();
    })
}

function endFetch(){
  fs.cpSync("./example", `./${ranobeName}`, { recursive: true })

  chapters.forEach((item, index) => {
    fs.appendFile(
      `./${ranobeName}/OPS/chapter-1-${index+1}.xhtml`,
      getChapterStart(chapterNames[index]) + item + defaultChapterEnd,
      ()=>null
    )
  })

  fs.appendFile(`./${ranobeName}/OPS/book.ncx`, getNcxContent(chapterNames), ()=>null);
  fs.appendFile(`./${ranobeName}/OPS/book.opf`, getOpfContent(chapters.length), ()=>null);
  fs.appendFile(`./${ranobeName}/OPS/toc.xhtml`, getTocContent(chapterNames), ()=>null);
}

function getNcxContent(chapterNames){
  var content = "";

  for(var i = 0; i < chapterNames.length; i++){
    content += `<navPoint id="chapter${i+3}" playOrder="${i+3}">
      <navLabel>
        <text>${chapterNames[i]}</text>
      </navLabel>
      <content src="chapter-1-${i+1}.xhtml" />
    </navPoint>`
  }

  content += defaultNcxEnd;

  return content;
}

function getOpfContent(length){
  var content = "";

  for(var i = 0; i < length; i++)
    content += `<item id="chapter${i+3}" href="chapter-1-${i+1}.xhtml" media-type="application/xhtml+xml" />`;

  content += '</manifest> <spine toc="ncx">';

  for(var i = 0; i < length+2; i++)
    content += `<itemref idref="chapter${i+1}" />`;

  content += defaultOpfEnd;

  return content;
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
const defaultNcxEnd = '</navMap></ncx>';
const defaultOpfEnd =`</spine><guide> <reference type="text" title="Постер" href="customCover.xhtml" /> </guide> </package>`
const defaultChapterEnd = `</body></html>`;
