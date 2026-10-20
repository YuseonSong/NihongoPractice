import { createHash } from 'node:crypto'
export const sha256=value=>createHash('sha256').update(value).digest('hex')
export const synthesisSettings={engine:'VOICEVOX Nemo',version:'0.24.0',speaker:10005,speakerName:'女声1',sampleRate:24000,speedScale:1,isolatedVowelsVoiced:true,generationRevision:2}
export const scriptHash=script=>sha256(JSON.stringify({script,settings:synthesisSettings}))
export function inspectWave(buffer){
  if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')throw new Error('Not a RIFF WAV file')
  let fmt,data
  for(let offset=12;offset+8<=buffer.length;){
    const name=buffer.toString('ascii',offset,offset+4), length=buffer.readUInt32LE(offset+4), start=offset+8
    if(start+length>buffer.length)throw new Error('Truncated WAV chunk')
    if(name==='fmt ')fmt={format:buffer.readUInt16LE(start),channels:buffer.readUInt16LE(start+2),sampleRate:buffer.readUInt32LE(start+4),bits:buffer.readUInt16LE(start+14)}
    if(name==='data')data=buffer.subarray(start,start+length)
    offset=start+length+(length%2)
  }
  if(!fmt||!data||fmt.format!==1||fmt.bits!==16||fmt.channels!==1||fmt.sampleRate!==24000||data.length%2)throw new Error('Expected mono PCM16 24kHz WAV')
  let energy=0,peak=0,clipped=0
  for(let i=0;i<data.length;i+=2){const value=Math.abs(data.readInt16LE(i))/32768;energy+=value*value;peak=Math.max(peak,value);if(value>.999)clipped++}
  const samples=data.length/2, duration=samples/fmt.sampleRate, rms=Math.sqrt(energy/Math.max(1,samples))
  if(duration<.08||duration>30||rms<.0005||peak<.005||clipped/Math.max(1,samples)>.01)throw new Error(`Invalid/silent/clipped recording: duration=${duration} rms=${rms} peak=${peak}`)
  return {duration,sampleRate:fmt.sampleRate,channels:fmt.channels,rms,peak,bytes:buffer.length}
}
