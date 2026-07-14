import type {
  Activity,
  FAQItem,
  FileResource,
  Post,
  Program,
  SiteSettings,
  YearSummary
} from '~/types/content'

export const activityTypeLabels = {
  regular: '常態陪伴',
  project: '專案活動',
  exploration: '探索走讀'
} as const

export const academicYears = [109, 110, 111, 112, 113, 114]

export const siteSettings: SiteSettings = {
  siteName: 'March Out For Love',
  clubNameZh: '愛潮關懷社',
  clubNameEn: 'March Out For Love',
  slogan: '讓陪伴走進日常，讓關懷成為行動。',
  facebookUrl: 'https://facebook.com/',
  instagramUrl: 'https://instagram.com/',
  contactText: '歡迎學校、社區夥伴與志工加入我們，一起把溫柔而扎實的服務帶到更多地方。',
  email: 'hello@marchoutforlove.org',
  phone: '02-0000-2026',
  locations: [
    {
      title: '社團辦公室',
      address: '台北市大安區和平東路一段 162 號',
      mapUrl: 'https://maps.google.com/?q=National+Taiwan+Normal+University'
    },
    {
      title: '服務集合點',
      address: '新北市板橋區文化路一段 161 號',
      mapUrl: 'https://maps.google.com/?q=Banqiao+Station'
    }
  ]
}

export const mockPrograms: Program[] = [
  {
    id: 'program-breakfast',
    title: '愛心早餐陪伴',
    slug: 'breakfast',
    summary: '在一天開始前，陪孩子好好吃飯，也好好說話。',
    description:
      '愛心早餐陪伴計畫固定與合作學校、社區據點配合，提供早餐、晨間閱讀與短談時間。服務不只補足一餐，更建立可被信任的日常關係。',
    imageUrl:
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=80',
    highlights: ['早餐補給', '晨間陪伴', '閱讀與生活談話', '長期追蹤']
  },
  {
    id: 'program-care',
    title: '關懷服務行動',
    slug: 'care',
    summary: '把青年志工帶進社區，把需求轉化為能持續的服務。',
    description:
      '透過物資募集、課後陪伴、節慶活動與家庭訪視，我們與地方夥伴共同設計服務流程，讓學生志工在真實場域中學習同理與責任。',
    imageUrl:
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1400&q=80',
    highlights: ['社區合作', '物資募集', '課後陪伴', '志工培力']
  },
  {
    id: 'program-exploration',
    title: '城市探索走讀',
    slug: 'exploration',
    summary: '用走讀理解城市，也用行動理解自己能投入的位置。',
    description:
      '城市探索走讀串連社福機構、地方店家、文化場域與公共議題，讓青年透過訪談、觀察與反思，建立服務前的理解能力。',
    imageUrl:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80',
    highlights: ['城市走讀', '機構參訪', '議題工作坊', '反思紀錄']
  }
]

export const mockActivities: Activity[] = [
  {
    id: 'act-001',
    title: '晨光早餐陪伴行動',
    slug: 'morning-breakfast-care',
    academicYear: 109,
    activityType: 'regular',
    eventDate: '2020-10-17',
    location: '新北市板橋區合作國小',
    participantsCount: 36,
    resultSummary: '完成 12 週早餐陪伴與晨間閱讀，建立穩定志工輪值制度。',
    content:
      '我們在每週三早晨抵達合作學校，與孩子一起用餐、整理一天的心情，也用短短二十分鐘閱讀故事。這個計畫讓陪伴變成可預期的日常，孩子知道有人會準時出現，志工也學會把服務做得細而長。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=1400&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    status: 'published',
    isFeatured: true,
    tags: ['早餐', '兒少陪伴', '長期服務'],
    images: [
      {
        id: 'img-001-1',
        imageUrl:
          'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=900&q=80',
        caption: '志工與孩子一起整理早餐桌。',
        sortOrder: 1
      },
      {
        id: 'img-001-2',
        imageUrl:
          'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80',
        caption: '晨間閱讀讓對話自然發生。',
        sortOrder: 2
      }
    ],
    files: ['服務成果摘要 109.pdf', '志工輪值表.csv']
  },
  {
    id: 'act-002',
    title: '偏鄉服務學習營',
    slug: 'rural-service-camp',
    academicYear: 110,
    activityType: 'project',
    eventDate: '2021-08-22',
    location: '花蓮縣玉里鎮',
    participantsCount: 48,
    resultSummary: '完成五日營隊、地方訪談與課程設計，服務 72 位學童。',
    content:
      '營隊前期先由幹部拜訪地方單位，確認孩子年齡、課程需求與交通條件。正式服務期間，志工分組帶領科學、閱讀、體育與生命教育課程，最後以成果展回饋地方夥伴。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    isFeatured: true,
    tags: ['營隊', '偏鄉', '服務學習'],
    images: [
      {
        id: 'img-002-1',
        imageUrl:
          'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=900&q=80',
        caption: '課程前的地方需求討論。',
        sortOrder: 1
      }
    ],
    files: ['110 偏鄉營成果報告.pdf']
  },
  {
    id: 'act-003',
    title: '城市探索與職涯走讀',
    slug: 'city-exploration-career-walk',
    academicYear: 111,
    activityType: 'exploration',
    eventDate: '2022-05-14',
    location: '台北市萬華區',
    participantsCount: 42,
    resultSummary: '拜訪 4 個社福與地方組織，產出青年服務提案 6 份。',
    content:
      '走讀從街區觀察開始，接著拜訪地方書店、青少年服務中心與社福機構。參與者透過訪談理解議題，再把觀察轉成服務提案，練習在行動之前先聽見現場。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    isFeatured: false,
    tags: ['走讀', '青年培力', '公共議題'],
    images: [
      {
        id: 'img-003-1',
        imageUrl:
          'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&q=80',
        caption: '社區訪談後的即時整理。',
        sortOrder: 1
      }
    ],
    files: ['111 城市走讀提案集.pdf']
  },
  {
    id: 'act-004',
    title: '寒假關懷物資募集',
    slug: 'winter-care-supply-drive',
    academicYear: 112,
    activityType: 'project',
    eventDate: '2023-01-09',
    location: '雙北合作社福據點',
    participantsCount: 64,
    resultSummary: '募集 280 份生活包，完成分類、配送與追蹤回報。',
    content:
      '寒假前夕，我們整理合作據點提出的需求清單，分批募集保暖用品、常溫食品與學用品。活動同步建立物資紀錄表，讓捐贈、分類與送達都能被清楚追蹤。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1604881991720-f91add269bed?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    isFeatured: false,
    tags: ['物資募集', '社福合作', '寒假服務'],
    images: [
      {
        id: 'img-004-1',
        imageUrl:
          'https://images.unsplash.com/photo-1607453998774-d533f65dac99?auto=format&fit=crop&w=900&q=80',
        caption: '物資分類與裝箱。',
        sortOrder: 1
      }
    ],
    files: ['112 物資募集清冊.xlsx']
  },
  {
    id: 'act-005',
    title: '兒少藝術共創工作坊',
    slug: 'children-art-workshop',
    academicYear: 113,
    activityType: 'regular',
    eventDate: '2024-04-20',
    location: '台北市中正區社區教室',
    participantsCount: 30,
    resultSummary: '完成 4 場藝術陪伴課程，展出 58 件孩子作品。',
    content:
      '藝術課不是要孩子畫得標準，而是陪他們說出看見的世界。志工以顏色、剪貼、故事與展覽布置帶領孩子表達，也邀請家長在成果日看見孩子的細膩感受。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    isFeatured: true,
    tags: ['藝術陪伴', '兒少', '成果展'],
    images: [
      {
        id: 'img-005-1',
        imageUrl:
          'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80',
        caption: '孩子用拼貼完成自己的故事。',
        sortOrder: 1
      }
    ],
    files: ['113 藝術工作坊成果冊.pdf']
  },
  {
    id: 'act-006',
    title: '校園公益市集與成果展',
    slug: 'campus-charity-market',
    academicYear: 114,
    activityType: 'project',
    eventDate: '2025-11-02',
    location: '校園中央廣場',
    participantsCount: 120,
    resultSummary: '串連 18 個攤位與 9 個合作社團，募集下一年度服務基金。',
    content:
      '公益市集把一整年的服務成果帶回校園，讓更多同學理解服務現場，也讓合作社團以攤位、短講、展板與互動體驗共同參與。募集款項將投入下一年度早餐陪伴與營隊。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1527525443983-6e60c75fff46?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    isFeatured: true,
    tags: ['公益市集', '成果展', '募款'],
    images: [
      {
        id: 'img-006-1',
        imageUrl:
          'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=900&q=80',
        caption: '合作社團共同完成市集攤位。',
        sortOrder: 1
      }
    ],
    files: ['114 公益市集攤位手冊.pdf']
  }
]

export const mockPosts: Post[] = [
  {
    id: 'post-001',
    title: '114 學年度志工招募開始',
    slug: 'volunteer-recruiting-114',
    excerpt: '新一年度志工招募開放報名，歡迎對陪伴、服務與社區議題有興趣的夥伴加入。',
    content:
      '本年度招募包含早餐陪伴、專案活動、影像紀錄與行政企劃四個組別。報名前不需要有服務經驗，只需要願意穩定出席、學習溝通，並尊重服務現場的節奏。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    publishedAt: '2025-09-08T09:00:00+08:00'
  },
  {
    id: 'post-002',
    title: '公益市集合作攤位徵件',
    slug: 'charity-market-open-call',
    excerpt: '邀請校內社團與地方品牌一起參與公益市集，讓服務成果被更多人看見。',
    content:
      '攤位內容可包含義賣、議題互動、服務成果展示或工作坊。社團將協助提供場地配置、宣傳素材與當日志工支援。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    publishedAt: '2025-10-01T10:30:00+08:00'
  },
  {
    id: 'post-003',
    title: '年度成果報告上線',
    slug: 'annual-report-published',
    excerpt: '112、113 學年度成果報告已整理完成，歡迎至檔案下載區閱讀。',
    content:
      '報告收錄服務時數、活動紀錄、合作夥伴回饋與未來改善方向。我們也會持續把資料整理成更容易閱讀的公開版本。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    publishedAt: '2025-06-28T14:00:00+08:00'
  }
]

export const mockFiles: FileResource[] = [
  {
    id: 'file-001',
    title: '109 學年度服務成果報告',
    fileUrl: '#',
    fileType: 'PDF',
    academicYear: 109,
    activityId: 'act-001',
    category: '成果報告',
    description: '早餐陪伴計畫與志工制度建立紀錄。',
    createdAt: '2021-01-20'
  },
  {
    id: 'file-002',
    title: '110 偏鄉服務學習營成果冊',
    fileUrl: '#',
    fileType: 'PDF',
    academicYear: 110,
    activityId: 'act-002',
    category: '成果報告',
    description: '營隊課程、地方合作與服務反思彙整。',
    createdAt: '2021-09-15'
  },
  {
    id: 'file-003',
    title: '111 城市走讀提案集',
    fileUrl: '#',
    fileType: 'PDF',
    academicYear: 111,
    activityId: 'act-003',
    category: '提案紀錄',
    description: '青年走讀後提出的社區服務構想。',
    createdAt: '2022-06-02'
  },
  {
    id: 'file-004',
    title: '112 物資募集清冊範本',
    fileUrl: '#',
    fileType: 'XLSX',
    academicYear: 112,
    activityId: 'act-004',
    category: '行政表單',
    description: '物資募集、分類、配送與簽收欄位範本。',
    createdAt: '2023-01-25'
  },
  {
    id: 'file-005',
    title: '113 藝術共創成果冊',
    fileUrl: '#',
    fileType: 'PDF',
    academicYear: 113,
    activityId: 'act-005',
    category: '成果報告',
    description: '兒少藝術作品與課程紀錄。',
    createdAt: '2024-05-15'
  },
  {
    id: 'file-006',
    title: '114 公益市集攤位手冊',
    fileUrl: '#',
    fileType: 'PDF',
    academicYear: 114,
    activityId: 'act-006',
    category: '活動手冊',
    description: '市集配置、攤位規範與工作分配。',
    createdAt: '2025-10-12'
  }
]

export const mockFaq: FAQItem[] = [
  {
    id: 'faq-001',
    question: '沒有服務經驗可以加入嗎？',
    answer: '可以。社團會安排培訓、見習與組內陪跑，只要願意穩定出席並尊重服務對象，就能從基礎任務開始。',
    sortOrder: 1,
    isVisible: true
  },
  {
    id: 'faq-002',
    question: '活動需要固定每週參加嗎？',
    answer: '常態陪伴計畫需要固定排班，專案活動則依任務時程安排。報名前可以先確認自己的時間，再選擇適合的組別。',
    sortOrder: 2,
    isVisible: true
  },
  {
    id: 'faq-003',
    question: '社團如何與學校或社福單位合作？',
    answer: '我們會先由幹部與合作單位確認需求、風險與可投入資源，再設計服務流程與志工訓練，避免只做一次性的熱鬧活動。',
    sortOrder: 3,
    isVisible: true
  },
  {
    id: 'faq-004',
    question: '可以提供捐款或物資嗎？',
    answer: '可以，請先透過聯絡頁與我們確認需求清單。為了讓資源準確抵達現場，我們會優先接受合作單位已確認的品項。',
    sortOrder: 4,
    isVisible: true
  },
  {
    id: 'faq-005',
    question: '網站上的報告可以下載使用嗎？',
    answer: '公開報告可供閱讀與引用，請保留來源。若需要活動照片或更完整資料，請來信說明用途。',
    sortOrder: 5,
    isVisible: true
  }
]

export const mockYearSummaries: YearSummary[] = academicYears.map((year) => {
  const activity = mockActivities.find((item) => item.academicYear === year) ?? mockActivities[0]

  return {
    year,
    theme:
      year === 109
        ? '從一份早餐開始'
        : year === 110
          ? '走向地方的學習'
          : year === 111
            ? '理解城市裡的需要'
            : year === 112
              ? '把資源送到現場'
              : year === 113
                ? '讓孩子用創作說話'
                : '讓成果回到校園',
    summary: `${year} 學年度聚焦「${activity.title}」，持續累積服務流程、志工培力與合作紀錄。`,
    coverImageUrl: activity.coverImageUrl,
    reportUrl: '#',
    highlights: [
      `${activity.participantsCount} 位志工與夥伴投入`,
      `${activity.tags[0]}主題行動`,
      '完成成果紀錄與檔案歸整'
    ]
  }
})
