import {readFile,writeFile} from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
export async function writeLaunchZip(root){
 const guide=`뉴스 탐험 사이트 열기\n\n1. ZIP 파일을 먼저 다운로드합니다.\n2. ZIP 파일의 압축을 풉니다.\n3. news-explorer 폴더 안의 index.html을 Chrome 또는 Edge로 엽니다.\n\n선생님 편집실에서 내용을 수정하고, 수정한 사이트 파일 저장 버튼으로 보관하세요.\n기존 자료는 JSON 내보내기 후 이 버전에서 가져올 수 있습니다.\n\n설치나 서버 없이 기본 자료를 사용할 수 있습니다.\n`;
 const entries=[['news-explorer/index.html',await readFile(new URL('school-news.html',root))],['news-explorer/OPEN-ME.txt',Buffer.from(guide)]];
 const files=[],directory=[];let offset=0;
 for(const [path,content] of entries){
  const name=Buffer.from(path),compressed=deflateRawSync(content),checksum=crc32(content);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(checksum,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(content.length,22);header.writeUInt16LE(name.length,26);
  files.push(header,name,compressed);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(0x21,14);central.writeUInt32LE(checksum,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(content.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);directory.push(central,name);offset+=header.length+name.length+compressed.length;
 }
 const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
 await writeFile(new URL('news-explorer.zip',root),Buffer.concat([...files,central,end]));
}
