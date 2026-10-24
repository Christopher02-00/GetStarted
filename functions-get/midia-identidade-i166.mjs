import {createHash} from 'node:crypto';

// Preserve the physical producer key already approved in R79.
// JSON quotes around the post ID are part of this established identity.
export function identidadePacoteMidiaI166(postagemId){
 if(typeof postagemId!=='string'||!/^[A-Za-z0-9_.-]{1,180}$/u.test(postagemId))throw Object.assign(Error('Confira a identidade física da postagem.'),{code:'midia/postagem'});
 return 'midia_'+createHash('sha256').update(JSON.stringify(postagemId)).digest('hex');
}

