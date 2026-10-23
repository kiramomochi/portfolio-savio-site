/*
  Conteúdo do site. É o único arquivo que você precisa editar para trocar
  textos, redes e vídeos. As três versões leem daqui.

  Arquivos esperados em /assets (troque pelos seus, mantendo os nomes):
    assets/logo.svg            sua logo (SVG ou PNG transparente; o site a deixa monocromática)
    assets/foto.jpg            sua foto
    assets/retrato.webp        foto dentro da forma fluida do Design (versão 1)
    assets/videos/trabalho-01.mp4 ... trabalho-04.mp4   vídeos em loop, 16:9, sem áudio
*/
window.SITE = {
  name: 'Savio Cavalcante',
  first: 'Savio',
  last: 'Cavalcante',

  // Caminho da pasta assets a partir de cada versão.
  assets: '../assets/',
  logo: 'logo.svg',
  photo: 'foto.jpg',

  // Foto dentro da forma fluida do Design (versão 1).
  // focus: o ponto do rosto, em frações da largura e da altura da imagem; fica sempre no centro da forma.
  // span: quanto da largura da imagem cabe no diâmetro da forma (menor = mais perto).
  designPhoto: { file: 'retrato.webp', focus: [0.43, 0.38], span: 0.8 },

  roles: {
    pt: ['Designer', 'Editor de vídeo', 'Motion designer', 'Web designer'],
    en: ['Designer', 'Video editor', 'Motion designer', 'Web designer']
  },

  // Redes do fechamento. Preencha a url; itens com url vazia aparecem como rascunho.
  socials: [
    { label: 'Instagram', handle: '@savio_cavalcante1', url: 'https://www.instagram.com/savio_cavalcante1/' },
    { label: 'LinkedIn', handle: 'Perfil', url: 'https://www.linkedin.com/feed/' },
    { label: 'Behance', handle: 'sviocavalcante', url: 'https://www.behance.net/sviocavalcante' }
  ],

  // Trabalhos recentes: 3 ou 4 vídeos 16:9.
  // file: vídeo principal. fileMobile (opcional): versão 720p para telas pequenas.
  // poster (opcional): imagem mostrada enquanto o vídeo carrega.
  works: [
    { file: 'videos/trabalho-01.mp4', fileMobile: 'videos/trabalho-01-720.mp4', poster: 'videos/trabalho-01.jpg', title: { pt: 'Alê · identidade visual', en: 'Alê · visual identity' } },
    { file: 'videos/trabalho-02.mp4', fileMobile: '', poster: '', title: { pt: 'Projeto 02', en: 'Project 02' } },
    { file: 'videos/trabalho-03.mp4', fileMobile: '', poster: '', title: { pt: 'Projeto 03', en: 'Project 03' } },
    { file: 'videos/trabalho-04.mp4', fileMobile: '', poster: '', title: { pt: 'Projeto 04', en: 'Project 04' } }
  ],

  // Textos comuns às três versões.
  strings: {
    pt: {
      'meta.title': 'Savio Cavalcante · Design, edição, motion e web',
      'meta.description': 'Portfólio de Savio Cavalcante: designer, editor de vídeo, motion designer e web designer.',
      'lead': 'Design, edição, motion e web, feitos pela mesma mão.',
      'ch.intro': 'Apresentação',
      'ch.design': 'Design',
      'ch.motion': 'Movimento',
      'ch.play': 'Interação',
      'ch.works': 'Trabalhos recentes',
      'ch.close': 'Onde me encontrar',
      'design.line': 'Antes de mover, organizar.',
      'motion.line': 'O tempo também é matéria.',
      'play.line': 'Toque. A forma responde.',
      'close.line': 'Me encontre por aqui.',
      'ui.map': 'Mapa',
      'ui.mapClose': 'Fechar mapa',
      'ui.motion': 'Animação',
      'ui.motionOn': 'Animação ligada',
      'ui.motionOff': 'Animação desligada',
      'ui.lang': 'English',
      'ui.langShort': 'EN',
      'ui.skip': 'Pular abertura',
      'ui.next': 'Seguir',
      'ui.home': 'Voltar ao início',
      'ui.chapters': 'Capítulos',
      'hint.pointer': 'Role para seguir · arraste para explorar',
      'hint.touch': 'Deslize para seguir · arraste para explorar',
      'video.missing': 'Coloque o vídeo em',
      'social.draft': 'link a definir'
    },
    en: {
      'meta.title': 'Savio Cavalcante · Design, editing, motion and web',
      'meta.description': 'Portfolio of Savio Cavalcante: designer, video editor, motion designer and web designer.',
      'lead': 'Design, editing, motion and web, made by the same hand.',
      'ch.intro': 'Introduction',
      'ch.design': 'Design',
      'ch.motion': 'Motion',
      'ch.play': 'Interaction',
      'ch.works': 'Recent work',
      'ch.close': 'Find me',
      'design.line': 'Order comes before motion.',
      'motion.line': 'Time is a material too.',
      'play.line': 'Touch it. It answers back.',
      'close.line': 'Find me here.',
      'ui.map': 'Map',
      'ui.mapClose': 'Close map',
      'ui.motion': 'Animation',
      'ui.motionOn': 'Animation on',
      'ui.motionOff': 'Animation off',
      'ui.lang': 'Português',
      'ui.langShort': 'PT',
      'ui.skip': 'Skip opening',
      'ui.next': 'Next',
      'ui.home': 'Back to start',
      'ui.chapters': 'Chapters',
      'hint.pointer': 'Scroll to follow · drag to explore',
      'hint.touch': 'Swipe to follow · drag to explore',
      'video.missing': 'Add the video at',
      'social.draft': 'link to come'
    }
  }
};
