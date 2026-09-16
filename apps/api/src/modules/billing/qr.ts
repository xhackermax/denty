const ALIGNMENT_POSITIONS:number[][]=[
  [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]
];
const RS_BLOCKS_M:number[][]=[
  [1,26,16],[1,44,28],[1,70,44],[2,50,32],[2,67,43],[4,43,27],[4,49,31],[2,60,38,2,61,39],[3,58,36,2,59,37],[4,69,43,1,70,44]
];
const G15=(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|1;
const G18=(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|1;
const G15_MASK=(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);
const PAD0=0xec,PAD1=0x11;
const EXP=new Array<number>(512).fill(0),LOG=new Array<number>(256).fill(0);
let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&0x100)x^=0x11d;}for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
function gfMul(a:number,b:number){return a===0||b===0?0:EXP[LOG[a]+LOG[b]]}
function polyMul(a:number[],b:number[]){const out=new Array(a.length+b.length-1).fill(0);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)out[i+j]^=gfMul(a[i],b[j]);return out}
function generator(ec:number){let g=[1];for(let i=0;i<ec;i++)g=polyMul(g,[1,EXP[i]]);return g}
function rsRemainder(data:number[],ec:number){const g=generator(ec),work=[...data,...new Array(ec).fill(0)];for(let i=0;i<data.length;i++){const factor=work[i];if(!factor)continue;for(let j=0;j<g.length;j++)work[i+j]^=gfMul(g[j],factor);}return work.slice(work.length-ec)}
class Bits{bytes:number[]=[];length=0;put(n:number,len:number){for(let i=len-1;i>=0;i--)this.bit(((n>>>i)&1)!==0)}bit(v:boolean){const idx=this.length>>3;if(this.bytes.length<=idx)this.bytes.push(0);if(v)this.bytes[idx]|=0x80>>(this.length&7);this.length++;}}
function blocks(version:number){const row=RS_BLOCKS_M[version-1],out:{total:number;data:number}[]=[];for(let i=0;i<row.length;i+=3)for(let n=0;n<row[i];n++)out.push({total:row[i+1],data:row[i+2]});return out}
function capacityBits(version:number){return blocks(version).reduce((n,b)=>n+b.data*8,0)}
function chooseVersion(byteLength:number){for(let v=1;v<=10;v++){const lenBits=v<10?8:16;if(4+lenBits+byteLength*8<=capacityBits(v))return v;}throw new Error("QR payload too large for supported invoice QR versions");}
function encodedBytes(text:string,version:number){const input=[...new TextEncoder().encode(text)],bits=new Bits(),limit=capacityBits(version),lenBits=version<10?8:16;bits.put(4,4);bits.put(input.length,lenBits);for(const b of input)bits.put(b,8);for(let i=0;i<Math.min(4,limit-bits.length);i++)bits.bit(false);while(bits.length%8)bits.bit(false);let toggle=0;while(bits.length<limit){bits.put(toggle++%2===0?PAD0:PAD1,8)}const specs=blocks(version),dc:number[][]=[],ec:number[][]=[];let offset=0,maxD=0,maxE=0;for(const spec of specs){const d=bits.bytes.slice(offset,offset+spec.data);offset+=spec.data;const ecc=rsRemainder(d,spec.total-spec.data);dc.push(d);ec.push(ecc);maxD=Math.max(maxD,d.length);maxE=Math.max(maxE,ecc.length)}const out:number[]=[];for(let i=0;i<maxD;i++)for(const d of dc)if(i<d.length)out.push(d[i]);for(let i=0;i<maxE;i++)for(const e of ec)if(i<e.length)out.push(e[i]);return out}
function bchDigit(value:number){let d=0;while(value){d++;value>>>=1}return d}
function typeInfo(data:number){let d=data<<10;while(bchDigit(d)-bchDigit(G15)>=0)d^=G15<<(bchDigit(d)-bchDigit(G15));return((data<<10)|d)^G15_MASK}
function typeNumber(version:number){let d=version<<12;while(bchDigit(d)-bchDigit(G18)>=0)d^=G18<<(bchDigit(d)-bchDigit(G18));return(version<<12)|d}
function setFinder(m:(boolean|null)[][],row:number,col:number){const size=m.length;for(let r=-1;r<=7;r++){if(row+r<0||row+r>=size)continue;for(let c=-1;c<=7;c++){if(col+c<0||col+c>=size)continue;m[row+r][col+c]=(r>=0&&r<=6&&(c===0||c===6))||(c>=0&&c<=6&&(r===0||r===6))||(r>=2&&r<=4&&c>=2&&c<=4)}}}
function setAlignment(m:(boolean|null)[][],version:number){for(const row of ALIGNMENT_POSITIONS[version-1])for(const col of ALIGNMENT_POSITIONS[version-1]){if(m[row][col]!==null)continue;for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)m[row+r][col+c]=r===-2||r===2||c===-2||c===2||(r===0&&c===0)}}
function setTiming(m:(boolean|null)[][]){for(let r=8;r<m.length-8;r++)if(m[r][6]===null)m[r][6]=r%2===0;for(let c=8;c<m.length-8;c++)if(m[6][c]===null)m[6][c]=c%2===0}
function setTypeInfo(m:(boolean|null)[][],mask=0){const bits=typeInfo(mask);const size=m.length;for(let i=0;i<15;i++){const mod=((bits>>>i)&1)===1;if(i<6)m[i][8]=mod;else if(i<8)m[i+1][8]=mod;else m[size-15+i][8]=mod;}for(let i=0;i<15;i++){const mod=((bits>>>i)&1)===1;if(i<8)m[8][size-i-1]=mod;else if(i<9)m[8][15-i]=mod;else m[8][15-i-1]=mod;}m[size-8][8]=true;}
function setVersionInfo(m:(boolean|null)[][],version:number){if(version<7)return;const bits=typeNumber(version),size=m.length;for(let i=0;i<18;i++){const mod=((bits>>>i)&1)===1;m[Math.floor(i/3)][i%3+size-11]=mod;m[i%3+size-11][Math.floor(i/3)]=mod;}}
function mapData(m:(boolean|null)[][],data:number[]){let inc=-1,row=m.length-1,bit=7,byte=0;for(let rawCol=m.length-1;rawCol>0;rawCol-=2){const col=rawCol<=6?rawCol-1:rawCol;while(true){for(const c of [col,col-1])if(m[row][c]===null){let dark=byte<data.length?((data[byte]>>>bit)&1)===1:false;if((row+c)%2===0)dark=!dark;m[row][c]=dark;if(--bit<0){byte++;bit=7}}row+=inc;if(row<0||row>=m.length){row-=inc;inc=-inc;break}}}}
export function qrMatrixM(text:string):boolean[][]{const input=new TextEncoder().encode(text),version=chooseVersion(input.length),size=version*4+17,m:(boolean|null)[][]=Array.from({length:size},()=>Array(size).fill(null));setFinder(m,0,0);setFinder(m,size-7,0);setFinder(m,0,size-7);setAlignment(m,version);setTiming(m);setTypeInfo(m,0);setVersionInfo(m,version);mapData(m,encodedBytes(text,version));return m.map(row=>row.map(Boolean));}
