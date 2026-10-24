/* Cinco funções literais da Office vigente; sem política nova de dias úteis. */
function calcularPascoa(ano){
    const a = ano % 19, b = Math.floor(ano/100), c = ano % 100;
    const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
    const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
    const i = Math.floor(c/4), k = c % 4;
    const l = (32+2*e+2*i-h-k) % 7;
    const m = Math.floor((a+11*h+22*l)/451);
    const mes = Math.floor((h+l-7*m+114)/31);
    const dia = ((h+l-7*m+114) % 31) + 1;
    return new Date(ano, mes-1, dia);
  }

function addDias(data, n){
    const d = new Date(data);
    d.setDate(d.getDate()+n);
    return d;
  }

function dataParaStr(d){ return dataLocal(d); }

function obterFeriados(ano){
    const pascoa = calcularPascoa(ano);
    const feriados = new Set([
      ano+'-01-01', ano+'-04-21', ano+'-05-01', ano+'-09-07',
      ano+'-10-12', ano+'-11-02', ano+'-11-15', ano+'-11-20', ano+'-12-25',
      dataParaStr(addDias(pascoa,-47)), // carnaval
      dataParaStr(addDias(pascoa,-2)),  // sexta santa
      dataParaStr(addDias(pascoa,60))   // corpus christi
    ]);
    return feriados;
  }

function dataLocal(d){
    const dt = d ? new Date(d) : new Date();
    return new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,10);
  }
export {obterFeriados};
