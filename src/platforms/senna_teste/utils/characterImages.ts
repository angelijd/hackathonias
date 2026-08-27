// Mapeador Inteligente de Imagens de Personagens em src/assets
// Suporta .png, .jpg, .jpeg e .webp com detecção automática de arquivos
const assetModules = import.meta.glob('../assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export function getCharacterImage(characterId: string): string | null {
  const normalizedId = characterId.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Mapeamentos de aliases e termos de busca
  const searchKeys: Record<string, string[]> = {
    eleven: ['eleven.jpg', 'eleven.png', 'eleven.webp', 'eleven.jpeg', 'onze'],
    mike_wheeler: ['mike.jpg', 'mike.png', 'mike.webp', 'mike.jpeg', 'mikewheeler'],
    dustin_henderson: ['dustin.webp', 'dustin.jpg', 'dustin.png', 'dustin.jpeg', 'dustinhenderson'],
    lucas_sinclair: ['lucas.jpg', 'lucas.png', 'lucas.webp', 'lucas.jpeg', 'lucassinclair'],
    will_byers: ['will.webp', 'will.jpg', 'will.png', 'will.jpeg', 'willbyers'],
    max_mayfield: ['max.jpg', 'max.png', 'max.webp', 'max.jpeg', 'maxmayfield'],
    steve_harrington: ['steve.jpg', 'steve.png', 'steve.webp', 'steve.jpeg', 'steveharrington'],
    nancy_wheeler: ['nancy.jpg', 'nancy.png', 'nancy.webp', 'nancy.jpeg', 'nancywheeler'],
    jim_hopper: ['jim.jpg', 'hopper.jpg', 'jim.png', 'jim.webp', 'jimhopper'],
    joyce_byers: ['joyce.jpg', 'joyce.png', 'joyce.webp', 'joycebyers'],

    // Wandinha
    wednesday_addams: ['wednesday', 'wandinha_personagem', 'wandinha.jpg', 'wandinha.webp', 'wednesday.jpg', 'wednesday.png', 'wednesday.webp'],
    enid_sinclair: ['enid.jpg', 'enid.png', 'enid.webp', 'enidsinclair'],
    tyler_galpin: ['tyler.jpg', 'tyler.png', 'tyler.webp', 'tylergalpin'],
    xavier_thorpe: ['xavier.jpg', 'xavier.png', 'xavier.webp', 'xavierthorpe'],
    bianca_barclay: ['bianca.jpg', 'bianca.png', 'bianca.webp', 'biancabarclay'],
    diretora_weems: ['weems.jpg', 'weems.png', 'weems.webp', 'larissaweems'],
    marilyn_thornhill: ['thornhill.jpg', 'thornhill.png', 'thornhill.webp', 'marilyn'],
    morticia_addams: ['morticia.jpg', 'morticia.png', 'morticia.webp', 'morticiaaddams'],
    gomez_addams: ['gomez.jpg', 'gomez.png', 'gomez.webp', 'gomezaddams'],
    thing_hand: ['hand.png', 'thing.jpg', 'thing.png', 'maozinha', 'thing.webp'],

    // Grey's Anatomy
    meredith_grey: ['meredith.jpg', 'meredith.png', 'meredith.webp', 'meredithgrey'],
    cristina_yang: ['cristina.jpg', 'cristina.png', 'cristina.webp', 'cristinayang'],
    alex_karev: ['alex.jpg', 'alex.png', 'alex.webp', 'alexkarev'],
    george_omalley: ['george.jpg', 'george.png', 'george.webp', 'georgeomalley'],
    izzie_stevens: ['izzie.jpg', 'izzie.png', 'izzie.webp', 'izziestevens'],
    derek_shepherd: ['derek.jpg', 'derek.png', 'derek.webp', 'derekshepherd'],
    miranda_bailey: ['bailey.jpg', 'bailey.png', 'bailey.webp', 'mirandabailey'],
    richard_webber: ['richard.jpg', 'webber.jpg', 'richard.png', 'richardwebber'],
    callie_torres: ['callie.jpg', 'callie.png', 'callie.webp', 'callietorres'],
    mark_sloan: ['mark.jpg', 'sloan.jpg', 'mark.png', 'marksloan'],
  };

  const candidateNames = searchKeys[characterId] || [normalizedId];

  // 1. Tenta correspondência exata de candidatos
  for (const path in assetModules) {
    const filename = path.split('/').pop()?.toLowerCase() || '';
    for (const cand of candidateNames) {
      if (filename === cand.toLowerCase() || filename.startsWith(cand.toLowerCase())) {
        // Ignora imagens globais da série se houver ambiguidade
        if (filename === 'wandinha.png' && characterId !== 'wednesday_addams') continue;
        if (filename === 'strangerthings.png') continue;
        if (filename === 'greysanatomy.png') continue;
        return assetModules[path];
      }
    }
  }

  // 2. Tenta correspondência parcial por nome
  for (const path in assetModules) {
    const filename = path.split('/').pop()?.toLowerCase() || '';
    const nameWithoutExt = filename.split('.')[0];
    if (normalizedId.includes(nameWithoutExt) && nameWithoutExt.length >= 3) {
      if (nameWithoutExt === 'wandinha' || nameWithoutExt === 'strangerthings' || nameWithoutExt === 'greysanatomy') continue;
      return assetModules[path];
    }
  }

  return null;
}
