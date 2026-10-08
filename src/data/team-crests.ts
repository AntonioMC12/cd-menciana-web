// RFAF team crests verified on 2026-10-04. New opponents use their official image URL.
export const teamCrests: Record<string, Record<string, string>> = {
  // Official RFAF match cards for group 17, round 1; checked 2026-10-08.
  "primer-equipo": {
    "cdapagayvamonosraviobrasservicios": "/images/escudo-oficial.svg",
    "cdlapalmafs": "/images/equipos/la-palma.jpg",
    "hamarcdgsportciudadinmobiliaria": "/images/equipos/hamar-bormujos.jpg",
    "cdsantaella2010": "/images/equipos/santaella.jpg",
    "cdcordobafutsalpatrimonio": "/images/equipos/cordoba-futsal.jpg",
    "circulomercantileindustrial": "/images/equipos/circulo-mercantil.jpg",
    "cdbenalup": "/images/equipos/benalup.jpg",
    "cduniondeportivalosamigos": "/images/equipos/union-los-amigos.jpg",
    "udalchoyano": "/images/equipos/alchoyano.jpg",
    "cdcadizfutsalyouasesoria": "/images/equipos/cadiz-futsal.jpg",
    "cdislenosanfernandofs": "/images/equipos/isleno-san-fernando.png",
    "cdvillalbafs": "/images/equipos/villalba.jpg",
    "cdalcaladeguadairafs": "/images/equipos/alcala-guadaira.png",
    "cddecorseneca": "/images/equipos/decorseneca.jpg",
    "cdolimpicdetriana": "/images/equipos/olimpic-triana.jpg",
    "cddeporteyocioadyo": "/images/equipos/adyo.jpg"
  },
  "filial": {
    "cdegafutsal": "/images/equipos/rfaf-f2d6e05f6799581b8d1b54977a32040b80b7d1c6.png",
    "cdcarcabuey": "/images/equipos/rfaf-0b67499ef8c095ebead45638487df510cb3b16dc.jpg",
    "cdmiragenilfsnolitos": "/images/equipos/rfaf-93a4cf91f8f6f6507dafdc3e754c724d6ad96988.jpg",
    "cdapagayvamonos": "/images/equipos/rfaf-3b21cd786a388b69f7c9197a81352c6349ea9aff.jpg",
    "cdfutbolsalaluque": "/images/equipos/rfaf-60772e77528246c4742915fcc233cc0653cd313f.jpg",
    "cdasocjuvenilpalenciana": "/images/equipos/rfaf-a314f293f9c1c3c411097152ca92bc1c44d9f665.png",
    "cdvilladebenameji": "/images/equipos/rfaf-58eee029fe0ca6ddf6b25e47f17a9baab6e3ecb7.png",
    "cdmontillafutsal": "/images/equipos/rfaf-d5d3aa039ac4d79c34cea6feefc133de6f8ece81.jpg"
  },
  "cadete": {
    "cdmenciana": "/images/equipos/rfaf-f63481c0426db4b7659463eb537561a190699c80.png",
    "cdcarcabuey": "/images/equipos/rfaf-0b67499ef8c095ebead45638487df510cb3b16dc.jpg",
    "cdencinasrealescf": "/images/equipos/rfaf-62719ed12b02d23bec080751e6231e55726cf396.png",
    "cdsantaella2010": "/images/equipos/rfaf-24299e86713137d2260b28386136a84cbb5aab73.jpg",
    "cdbocafspriego": "/images/equipos/rfaf-895a940e185efaee0bc399d1bafcd4bbfc2f6085.jpg",
    "cdmiragenilfscodimar": "/images/equipos/rfaf-93a4cf91f8f6f6507dafdc3e754c724d6ad96988.jpg",
    "cdarasfutsala": "/images/equipos/rfaf-4d2e99b781c3fc053cf0e77f8a9f1e6fcf23bcce.jpg"
  },
  "infantil": {
    "cdtoxar": "/images/equipos/rfaf-e643ccb32d60b63ff7cd2dd14c241b9963a66d4b.png",
    "cdmencianacentrocicloturistasubbetica": "/images/equipos/rfaf-f63481c0426db4b7659463eb537561a190699c80.png",
    "cdencinasrealescf": "/images/equipos/rfaf-62719ed12b02d23bec080751e6231e55726cf396.png",
    "cdalbendincaprichodelguadajoz": "/images/equipos/rfaf-c2a6fbd1c0a6e4041bdfd07a6f982903e5cc1fdf.jpg",
    "cdasocjuvenilpalenciana": "/images/equipos/rfaf-a314f293f9c1c3c411097152ca92bc1c44d9f665.png",
    "cdfutbolsalaluque": "/images/equipos/rfaf-60772e77528246c4742915fcc233cc0653cd313f.jpg",
    "cdbocafspriego": "/images/equipos/rfaf-895a940e185efaee0bc399d1bafcd4bbfc2f6085.jpg",
    "cdarasfutsal": "/images/equipos/rfaf-4d2e99b781c3fc053cf0e77f8a9f1e6fcf23bcce.jpg",
    "cdmiragenilfscodimar": "/images/equipos/rfaf-93a4cf91f8f6f6507dafdc3e754c724d6ad96988.jpg",
    "cdcabrafs": "/images/equipos/rfaf-55ee77d17a4f190ab7be641821fd4137ee7630db.jpg"
  }
};

const normalizeTeamName = (name: string) => name.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
  .replace(/clubdeportivo/g, 'cd');
const aliases: Record<string, string> = { cdarasfutsalaa: 'cdarasfutsala', cdarasfutsal: 'cdarasfutsala' };
const crestCatalog = Object.assign({}, ...Object.values(teamCrests).reverse()) as Record<string, string>;

/** Shared by static cards, browser rendering and API snapshots. */
export function getTeamCrest(name: string): string | undefined {
  const key = normalizeTeamName(name);
  return crestCatalog[aliases[key] || key];
}
