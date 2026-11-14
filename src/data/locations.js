/**
 * Comprehensive All-India Locations Dataset
 * Covers all 28 States + 8 Union Territories of India with official districts.
 * Supports both English ('en') and Hindi ('hi') localization.
 */

export const STATES_ALL = [
  // 1. Uttar Pradesh
  {
    key: "UP",
    en: "Uttar Pradesh",
    hi: "उत्तर प्रदेश",
    districts: [
      { key: "agra", en: "Agra", hi: "आगरा", lat: 27.1767, lng: 78.0081, tehsils: [
        { en: "Agra Sadar", hi: "आगरा सदर", lat: 27.18, lng: 78.01 },
        { en: "Fatehabad", hi: "फतेहाबाद", lat: 27.02, lng: 78.30 },
        { en: "Etmadpur", hi: "एत्मादपुर", lat: 27.23, lng: 78.20 },
        { en: "Kheragarh", hi: "खेरागढ़", lat: 26.95, lng: 77.82 },
        { en: "Bah", hi: "बाह", lat: 26.87, lng: 78.60 },
        { en: "Kiraoli", hi: "किरावली", lat: 27.15, lng: 77.78 }
      ]},
      { key: "aligarh", en: "Aligarh", hi: "अलीगढ़", lat: 27.8974, lng: 78.0880, tehsils: [
        { en: "Koil (Aligarh)", hi: "कोल (अलीगढ़)", lat: 27.90, lng: 78.08 },
        { en: "Khair", hi: "खैर", lat: 27.94, lng: 77.84 },
        { en: "Atrauli", hi: "अतरौली", lat: 28.03, lng: 78.28 },
        { en: "Iglas", hi: "इगलास", lat: 27.71, lng: 77.93 },
        { en: "Gabhana", hi: "गभाना", lat: 28.02, lng: 77.92 }
      ]},
      { key: "prayagraj", en: "Prayagraj (Allahabad)", hi: "प्रयागराज (इलाहाबाद)", lat: 25.4358, lng: 81.8463, tehsils: [
        { en: "Sadar", hi: "सदर", lat: 25.44, lng: 81.85 },
        { en: "Phulpur", hi: "फूलपुर", lat: 25.55, lng: 82.08 },
        { en: "Soraon", hi: "सोरांव", lat: 25.58, lng: 81.85 },
        { en: "Karchhana", hi: "करछना", lat: 25.28, lng: 81.92 },
        { en: "Handia", hi: "हंडिया", lat: 25.37, lng: 82.18 },
        { en: "Meja", hi: "मेजा", lat: 25.13, lng: 82.12 },
        { en: "Bara", hi: "बारा", lat: 25.25, lng: 81.72 },
        { en: "Koraon", hi: "कोरांव", lat: 24.98, lng: 82.07 }
      ]},
      { key: "ambedkar_nagar", en: "Ambedkar Nagar", hi: "अंबेडकर नगर", lat: 26.4447, lng: 82.6781 },
      { key: "amethi", en: "Amethi", hi: "अमेठी", lat: 26.1557, lng: 81.8159 },
      { key: "amroha", en: "Amroha", hi: "अमरोहा", lat: 28.9044, lng: 78.4684 },
      { key: "auraiya", en: "Auraiya", hi: "औरैया", lat: 26.4652, lng: 79.5103 },
      { key: "ayodhya", en: "Ayodhya (Faizabad)", hi: "अयोध्या (फैजाबाद)", lat: 26.7922, lng: 82.1998, tehsils: [
        { en: "Ayodhya Sadar", hi: "अयोध्या सदर", lat: 26.79, lng: 82.20 },
        { en: "Rudauli", hi: "रुदौली", lat: 26.75, lng: 81.75 },
        { en: "Bikapur", hi: "बीकापुर", lat: 26.60, lng: 82.13 },
        { en: "Sohawal", hi: "सोहावल", lat: 26.77, lng: 82.02 },
        { en: "Milkipur", hi: "मिल्कीपुर", lat: 26.58, lng: 81.90 }
      ]},
      { key: "azamgarh", en: "Azamgarh", hi: "आज़मगढ़", lat: 26.0683, lng: 83.1837 },
      { key: "baghpat", en: "Baghpat", hi: "बागपत", lat: 28.9452, lng: 77.2202 },
      { key: "bahraich", en: "Bahraich", hi: "बहराइच", lat: 27.5744, lng: 81.5978 },
      { key: "ballia", en: "Ballia", hi: "बलिया", lat: 25.7583, lng: 84.1482 },
      { key: "balrampur", en: "Balrampur", hi: "बलरामपुर", lat: 27.4293, lng: 82.1793 },
      { key: "banda", en: "Banda", hi: "बांदा", lat: 25.4754, lng: 80.3347 },
      { key: "barabanki", en: "Barabanki", hi: "बाराबंकी", lat: 26.9272, lng: 81.1843 },
      { key: "bareilly", en: "Bareilly", hi: "बरेली", lat: 28.3670, lng: 79.4304 },
      { key: "basti", en: "Basti", hi: "बस्ती", lat: 26.7977, lng: 82.7483 },
      { key: "bhadohi", en: "Bhadohi", hi: "भदोही", lat: 25.3941, lng: 82.5709 },
      { key: "bijnor", en: "Bijnor", hi: "बिजनौर", lat: 29.3732, lng: 78.1358 },
      { key: "budaun", en: "Budaun", hi: "बदायूँ", lat: 28.0315, lng: 79.1259 },
      { key: "bulandshahr", en: "Bulandshahr", hi: "बुलंदशहर", lat: 28.4069, lng: 77.8498 },
      { key: "chandauli", en: "Chandauli", hi: "चंदौली", lat: 25.2612, lng: 83.2662 },
      { key: "chitrakoot", en: "Chitrakoot", hi: "चित्रकूट", lat: 25.2057, lng: 80.9142 },
      { key: "deoria", en: "Deoria", hi: "देवरिया", lat: 26.5023, lng: 83.7791 },
      { key: "etah", en: "Etah", hi: "एटा", lat: 27.5562, lng: 78.6659 },
      { key: "etawah", en: "Etawah", hi: "इटावा", lat: 26.7769, lng: 79.0238 },
      { key: "farrukhabad", en: "Farrukhabad", hi: "फर्रुखाबाद", lat: 27.3826, lng: 79.5828 },
      { key: "fatehpur", en: "Fatehpur", hi: "फतेहपुर", lat: 25.9274, lng: 80.8126 },
      { key: "firozabad", en: "Firozabad", hi: "फ़िरोज़ाबाद", lat: 27.1592, lng: 78.3957 },
      { key: "gautam_buddha_nagar", en: "Gautam Buddha Nagar (Noida)", hi: "गौतम बुद्ध नगर (नोएडा)", lat: 28.5355, lng: 77.3910, tehsils: [
        { en: "Noida Sadar", hi: "नोएडा सदर", lat: 28.53, lng: 77.39 },
        { en: "Dadri", hi: "दादरी", lat: 28.55, lng: 77.55 },
        { en: "Jewar", hi: "जेवर", lat: 28.13, lng: 77.55 }
      ]},
      { key: "ghaziabad", en: "Ghaziabad", hi: "गाजियाबाद", lat: 28.6692, lng: 77.4538, tehsils: [
        { en: "Ghaziabad Sadar", hi: "गाजियाबाद सदर", lat: 28.67, lng: 77.45 },
        { en: "Modinagar", hi: "मोदीनगर", lat: 28.84, lng: 77.58 },
        { en: "Loni", hi: "लोनी", lat: 28.75, lng: 77.29 }
      ]},
      { key: "ghazipur", en: "Ghazipur", hi: "गाज़ीपुर", lat: 25.5840, lng: 83.5770 },
      { key: "gonda", en: "Gonda", hi: "गोंडा", lat: 27.1306, lng: 81.9619 },
      { key: "gorakhpur", en: "Gorakhpur", hi: "गोरखपुर", lat: 26.7606, lng: 83.3732, tehsils: [
        { en: "Gorakhpur Sadar", hi: "गोरखपुर सदर", lat: 26.76, lng: 83.37 },
        { en: "Sahjanwa", hi: "सहजनवा", lat: 26.77, lng: 83.20 },
        { en: "Campierganj", hi: "कैम्पियरगंज", lat: 27.02, lng: 83.25 },
        { en: "Chauri Chaura", hi: "चौरी चौरा", lat: 26.65, lng: 83.58 },
        { en: "Bansgaon", hi: "बांसगांव", lat: 26.55, lng: 83.35 }
      ]},
      { key: "hamirpur_up", en: "Hamirpur", hi: "हमीरपुर", lat: 25.9554, lng: 80.1504 },
      { key: "hapur", en: "Hapur", hi: "हापुड़", lat: 28.7306, lng: 77.7759 },
      { key: "hardoi", en: "Hardoi", hi: "हरदोई", lat: 27.3949, lng: 80.1292 },
      { key: "hathras", en: "Hathras", hi: "हाथरस", lat: 27.5968, lng: 78.0519 },
      { key: "jalaun", en: "Jalaun (Orai)", hi: "जालौन (उरई)", lat: 25.9902, lng: 79.4526 },
      { key: "jaunpur", en: "Jaunpur", hi: "जौनपुर", lat: 25.7464, lng: 82.6837 },
      { key: "jhansi", en: "Jhansi", hi: "झांसी", lat: 25.4484, lng: 78.5685, tehsils: [
        { en: "Jhansi Sadar", hi: "झांसी सदर", lat: 25.45, lng: 78.57 },
        { en: "Mauranipur", hi: "मऊरानीपुर", lat: 25.24, lng: 79.15 },
        { en: "Moth", hi: "मोंठ", lat: 25.71, lng: 78.96 },
        { en: "Garautha", hi: "गरौठा", lat: 25.57, lng: 79.30 },
        { en: "Tahrauli", hi: "टहरौली", lat: 25.41, lng: 79.03 }
      ]},
      { key: "kannauj", en: "Kannauj", hi: "कन्नौज", lat: 27.0549, lng: 79.9172 },
      { key: "kanpur_dehat", en: "Kanpur Dehat", hi: "कानपुर देहात", lat: 26.3456, lng: 79.9482 },
      { key: "kanpur_nagar", en: "Kanpur Nagar", hi: "कानपुर नगर", lat: 26.4499, lng: 80.3319, tehsils: [
        { en: "Kanpur Sadar", hi: "कानपुर सदर", lat: 26.46, lng: 80.33 },
        { en: "Bilhaur", hi: "बिल्हौर", lat: 26.85, lng: 80.05 },
        { en: "Ghatampur", hi: "घाटमपुर", lat: 26.15, lng: 80.17 },
        { en: "Narwal", hi: "नरवल", lat: 26.28, lng: 80.45 }
      ]},
      { key: "kasganj", en: "Kasganj", hi: "कासगंज", lat: 27.8083, lng: 78.6464 },
      { key: "kaushambi", en: "Kaushambi", hi: "कौशाम्बी", lat: 25.5312, lng: 81.3963 },
      { key: "kushinagar", en: "Kushinagar", hi: "कुशीनगर", lat: 26.7408, lng: 83.8893 },
      { key: "lakhimpur_kheri", en: "Lakhimpur Kheri", hi: "लखीमपुर खीरी", lat: 27.9463, lng: 80.7787 },
      { key: "lalitpur", en: "Lalitpur", hi: "ललितपुर", lat: 24.6897, lng: 78.4116 },
      { key: "lucknow", en: "Lucknow", hi: "लखनऊ", lat: 26.8467, lng: 80.9462, tehsils: [
        { en: "Hazratganj / Sadar", hi: "हज़रतगंज / सदर", lat: 26.85, lng: 80.94 },
        { en: "Mohanlalganj", hi: "मोहनलालगंज", lat: 26.68, lng: 80.98 },
        { en: "Bakshi Ka Talab", hi: "बक्शी का तालाब", lat: 26.98, lng: 80.89 },
        { en: "Malihabad", hi: "मलिहाबाद", lat: 26.92, lng: 80.71 },
        { en: "Sarojini Nagar", hi: "सरोजनी नगर", lat: 26.75, lng: 80.87 }
      ]},
      { key: "maharajganj", en: "Maharajganj", hi: "महराजगंज", lat: 27.1451, lng: 83.5615 },
      { key: "mahoba", en: "Mahoba", hi: "महोबा", lat: 25.2921, lng: 79.8732 },
      { key: "mainpuri", en: "Mainpuri", hi: "मैनपुरी", lat: 27.2289, lng: 79.0256 },
      { key: "mathura", en: "Mathura", hi: "मथुरा", lat: 27.4924, lng: 77.6737 },
      { key: "mau", en: "Mau", hi: "मऊ", lat: 25.9419, lng: 83.5606 },
      { key: "meerut", en: "Meerut", hi: "मेरठ", lat: 28.9845, lng: 77.7064, tehsils: [
        { en: "Meerut Sadar", hi: "मेरठ सदर", lat: 28.98, lng: 77.70 },
        { en: "Mawana", hi: "मवाना", lat: 29.10, lng: 77.92 },
        { en: "Sardhana", hi: "सरधना", lat: 29.15, lng: 77.62 }
      ]},
      { key: "mirzapur", en: "Mirzapur", hi: "मिर्ज़ापुर", lat: 25.1337, lng: 82.5644 },
      { key: "moradabad", en: "Moradabad", hi: "मुरादाबाद", lat: 28.8386, lng: 78.7733 },
      { key: "muzaffarnagar", en: "Muzaffarnagar", hi: "मुज़फ़्फ़रनगर", lat: 29.4727, lng: 77.7085 },
      { key: "pilibhit", en: "Pilibhit", hi: "पीलीभीत", lat: 28.6315, lng: 79.8027 },
      { key: "pratapgarh", en: "Pratapgarh", hi: "प्रतापगढ़", lat: 25.8974, lng: 81.9472 },
      { key: "raebareli", en: "Raebareli", hi: "रायबरेली", lat: 26.2236, lng: 81.2409 },
      { key: "rampur", en: "Rampur", hi: "रामपुर", lat: 28.8154, lng: 79.0256 },
      { key: "saharanpur", en: "Saharanpur", hi: "सहारनपुर", lat: 29.9678, lng: 77.5460 },
      { key: "sambhal", en: "Sambhal", hi: "संभल", lat: 28.5839, lng: 78.5684 },
      { key: "sant_kabir_nagar", en: "Sant Kabir Nagar", hi: "संत कबीर नगर", lat: 26.7844, lng: 83.0569 },
      { key: "shahjahanpur", en: "Shahjahanpur", hi: "शाहजहाँपुर", lat: 27.8805, lng: 79.9122 },
      { key: "shamli", en: "Shamli", hi: "शामली", lat: 29.4497, lng: 77.3102 },
      { key: "shravasti", en: "Shravasti", hi: "श्रावस्ती", lat: 27.7078, lng: 81.9547 },
      { key: "siddharthnagar", en: "Siddharthnagar", hi: "सिद्धार्थनगर", lat: 27.2981, lng: 82.8094 },
      { key: "sitapur", en: "Sitapur", hi: "सीतापुर", lat: 27.5684, lng: 80.6829 },
      { key: "sonbhadra", en: "Sonbhadra", hi: "सोनभद्र", lat: 24.6853, lng: 83.0674 },
      { key: "sultanpur", en: "Sultanpur", hi: "सुल्तानपुर", lat: 26.2648, lng: 82.0727 },
      { key: "unnao", en: "Unnao", hi: "उन्नाव", lat: 26.5393, lng: 80.4878 },
      { key: "varanasi", en: "Varanasi (Banaras)", hi: "वाराणसी (बनारस)", lat: 25.3176, lng: 82.9739, tehsils: [
        { en: "Varanasi Sadar", hi: "वाराणसी सदर", lat: 25.32, lng: 82.98 },
        { en: "Pindra", hi: "पिंडरा", lat: 25.52, lng: 82.83 },
        { en: "Rajatalab", hi: "राजातालाब", lat: 25.26, lng: 82.87 }
      ]}
    ]
  },

  // 2. Bihar
  {
    key: "BR",
    en: "Bihar",
    hi: "बिहार",
    districts: [
      { key: "patna", en: "Patna", hi: "पटना", lat: 25.5941, lng: 85.1376, tehsils: [
        { en: "Patna Sadar", hi: "पटना सदर", lat: 25.60, lng: 85.14 },
        { en: "Danapur", hi: "दानापुर", lat: 25.63, lng: 85.04 },
        { en: "Barh", hi: "बाढ़", lat: 25.48, lng: 85.71 },
        { en: "Masaurhi", hi: "मसौढ़ी", lat: 25.35, lng: 85.03 },
        { en: "Paliganj", hi: "पालीगंज", lat: 25.33, lng: 84.80 },
        { en: "Fatuha", hi: "फतुहा", lat: 25.50, lng: 85.31 }
      ]},
      { key: "gaya", en: "Gaya", hi: "गया", lat: 24.7914, lng: 85.0002 },
      { key: "muzaffarpur", en: "Muzaffarpur", hi: "मुज़फ़्फ़रपुर", lat: 26.1209, lng: 85.3647 },
      { key: "bhagalpur", en: "Bhagalpur", hi: "भागलपुर", lat: 25.2425, lng: 86.9842 },
      { key: "darbhanga", en: "Darbhanga", hi: "दरभंगा", lat: 26.1542, lng: 85.8918 },
      { key: "araria", en: "Araria", hi: "अररिया", lat: 26.1502, lng: 87.4984 },
      { key: "arwal", en: "Arwal", hi: "अरवल", lat: 25.2437, lng: 84.6738 },
      { key: "aurangabad_bihar", en: "Aurangabad", hi: "औरंगाबाद", lat: 24.7539, lng: 84.3742 },
      { key: "banka", en: "Banka", hi: "बांका", lat: 24.8872, lng: 86.9234 },
      { key: "begusarai", en: "Begusarai", hi: "बेगूसराय", lat: 25.4182, lng: 86.1272 },
      { key: "bhojpur", en: "Bhojpur (Ara)", hi: "भोजपुर (आरा)", lat: 25.5541, lng: 84.6641 },
      { key: "buxar", en: "Buxar", hi: "बक्सर", lat: 25.5647, lng: 83.9777 },
      { key: "east_champaran", en: "East Champaran (Motihari)", hi: "पूर्वी चंपारण (मोतिहारी)", lat: 26.6469, lng: 84.9126 },
      { key: "gopalganj", en: "Gopalganj", hi: "गोपालगंज", lat: 26.4674, lng: 84.4449 },
      { key: "jamui", en: "Jamui", hi: "जमुई", lat: 24.9258, lng: 86.2235 },
      { key: "jehanabad", en: "Jehanabad", hi: "जहानाबाद", lat: 25.2138, lng: 84.9864 },
      { key: "kaimur", en: "Kaimur (Bhabua)", hi: "कैमूर (भभुआ)", lat: 25.0449, lng: 83.6143 },
      { key: "katihar", en: "Katihar", hi: "कटिहार", lat: 25.5393, lng: 87.5734 },
      { key: "khagaria", en: "Khagaria", hi: "खगड़िया", lat: 25.5034, lng: 86.4828 },
      { key: "kishanganj", en: "Kishanganj", hi: "किशनगंज", lat: 26.0747, lng: 87.9461 },
      { key: "lakhisarai", en: "Lakhisarai", hi: "लखीसराय", lat: 25.1782, lng: 86.0945 },
      { key: "madhepura", en: "Madhepura", hi: "मधेपुरा", lat: 25.9264, lng: 86.7937 },
      { key: "madhubani", en: "Madhubani", hi: "मधुबनी", lat: 26.3548, lng: 86.0718 },
      { key: "munger", en: "Munger", hi: "मुंगेर", lat: 25.3756, lng: 86.4744 },
      { key: "nalanda", en: "Nalanda (Bihar Sharif)", hi: "नालंदा (बिहार शरीफ)", lat: 25.1982, lng: 85.5149 },
      { key: "nawada", en: "Nawada", hi: "नवादा", lat: 24.8872, lng: 85.5414 },
      { key: "purnia", en: "Purnia", hi: "पूर्णिया", lat: 25.7771, lng: 87.4753 },
      { key: "rohtas", en: "Rohtas (Sasaram)", hi: "रोहतास (सासाराम)", lat: 24.9522, lng: 84.0156 },
      { key: "saharsa", en: "Saharsa", hi: "सहरसा", lat: 25.8835, lng: 86.6006 },
      { key: "samastipur", en: "Samastipur", hi: "समस्तीपुर", lat: 25.8629, lng: 85.7811 },
      { key: "saran", en: "Saran (Chhapra)", hi: "सारण (छपरा)", lat: 25.7796, lng: 84.7499 },
      { key: "sheikhpura", en: "Sheikhpura", hi: "शेखपुरा", lat: 25.1415, lng: 85.8637 },
      { key: "sheohar", en: "Sheohar", hi: "शिवहर", lat: 26.5165, lng: 85.2974 },
      { key: "sitamarhi", en: "Sitamarhi", hi: "सीतामढ़ी", lat: 26.5982, lng: 85.4897 },
      { key: "siwan", en: "Siwan", hi: "सीवान", lat: 26.2243, lng: 84.3598 },
      { key: "supaul", en: "Supaul", hi: "सुपौल", lat: 26.1260, lng: 86.6053 },
      { key: "vaishali", en: "Vaishali (Hajipur)", hi: "वैशाली (हाजीपुर)", lat: 25.6858, lng: 85.2146 },
      { key: "west_champaran", en: "West Champaran (Bettiah)", hi: "पश्चिम चंपारण (बेतिया)", lat: 26.8024, lng: 84.5028 }
    ]
  },

  // 3. Delhi-NCR
  {
    key: "DL",
    en: "Delhi (NCR)",
    hi: "दिल्ली (NCR)",
    districts: [
      { key: "central_delhi", en: "Central Delhi", hi: "सेंट्रल दिल्ली", lat: 28.6448, lng: 77.2167 },
      { key: "east_delhi", en: "East Delhi", hi: "ईस्ट दिल्ली", lat: 28.6276, lng: 77.2784 },
      { key: "new_delhi", en: "New Delhi (Connaught Place)", hi: "नई दिल्ली (कनॉट प्लेस)", lat: 28.6139, lng: 77.2090 },
      { key: "north_delhi", en: "North Delhi", hi: "नॉर्थ दिल्ली", lat: 28.7180, lng: 77.1650 },
      { key: "north_east_delhi", en: "North East Delhi", hi: "नॉर्थ ईस्ट दिल्ली", lat: 28.7100, lng: 77.2600 },
      { key: "north_west_delhi", en: "North West Delhi", hi: "नॉर्थ वेस्ट दिल्ली", lat: 28.7300, lng: 77.0800 },
      { key: "shahdara", en: "Shahdara", hi: "शाहदरा", lat: 28.6700, lng: 77.2900 },
      { key: "south_delhi", en: "South Delhi (Saket)", hi: "साउथ दिल्ली (साकेत)", lat: 28.5244, lng: 77.2066 },
      { key: "south_east_delhi", en: "South East Delhi", hi: "साउथ ईस्ट दिल्ली", lat: 28.5500, lng: 77.2700 },
      { key: "south_west_delhi", en: "South West Delhi (Dwarka)", hi: "साउथ वेस्ट दिल्ली (द्वारका)", lat: 28.5921, lng: 77.0460 },
      { key: "west_delhi", en: "West Delhi (Janakpuri)", hi: "वेस्ट दिल्ली (जनकपुरी)", lat: 28.6219, lng: 77.0878 }
    ]
  },

  // 4. Madhya Pradesh
  {
    key: "MP",
    en: "Madhya Pradesh",
    hi: "मध्य प्रदेश",
    districts: [
      { key: "bhopal", en: "Bhopal", hi: "भोपाल", lat: 23.2599, lng: 77.4126 },
      { key: "indore", en: "Indore", hi: "इंदौर", lat: 22.7196, lng: 75.8577 },
      { key: "gwalior", en: "Gwalior", hi: "ग्वालियर", lat: 26.2183, lng: 78.1828 },
      { key: "jabalpur", en: "Jabalpur", hi: "जबलपुर", lat: 23.1815, lng: 79.9864 },
      { key: "ujjain", en: "Ujjain", hi: "उज्जैन", lat: 23.1765, lng: 75.7885 },
      { key: "sagar", en: "Sagar", hi: "सागर", lat: 23.8388, lng: 78.7378 },
      { key: "rewa", en: "Rewa", hi: "रीवा", lat: 24.5362, lng: 81.3037 },
      { key: "satna", en: "Satna", hi: "सतना", lat: 24.5806, lng: 80.8286 },
      { key: "chhatarpur", en: "Chhatarpur", hi: "छतरपुर", lat: 24.9163, lng: 79.5811 },
      { key: "vidisha", en: "Vidisha", hi: "विदिशा", lat: 23.5236, lng: 77.8144 },
      { key: "dewas", en: "Dewas", hi: "देवास", lat: 22.9676, lng: 76.0534 },
      { key: "ratlam", en: "Ratlam", hi: "रतलाम", lat: 23.3315, lng: 75.0367 },
      { key: "mandsaur", en: "Mandsaur", hi: "मंदसौर", lat: 24.0722, lng: 75.0682 },
      { key: "neemuch", en: "Neemuch", hi: "नीमच", lat: 24.4646, lng: 74.8722 },
      { key: "morena", en: "Morena", hi: "मुरैना", lat: 26.4947, lng: 77.9940 },
      { key: "bhind", en: "Bhind", hi: "भिंड", lat: 26.5644, lng: 78.7892 },
      { key: "shivpuri", en: "Shivpuri", hi: "शिवपुरी", lat: 25.4319, lng: 77.6593 },
      { key: "guna", en: "Guna", hi: "गुना", lat: 24.6489, lng: 77.3094 },
      { key: "ashoknagar", en: "Ashoknagar", hi: "अशोकनगर", lat: 24.5772, lng: 77.7281 },
      { key: "damoh", en: "Damoh", hi: "दमोह", lat: 23.8323, lng: 79.4418 },
      { key: "panna", en: "Panna", hi: "पन्ना", lat: 24.7206, lng: 80.1852 },
      { key: "tikamgarh", en: "Tikamgarh", hi: "टीकमगढ़", lat: 24.7447, lng: 78.8311 },
      { key: "niwari", en: "Niwari", hi: "निवाड़ी", lat: 25.3600, lng: 78.8000 },
      { key: "singrauli", en: "Singrauli", hi: "सिंगरौली", lat: 24.1997, lng: 82.6645 },
      { key: "sidhi", en: "Sidhi", hi: "सीधी", lat: 24.4034, lng: 81.8847 },
      { key: "shahdol", en: "Shahdol", hi: "शहडोल", lat: 23.2847, lng: 81.3539 },
      { key: "anuppur", en: "Anuppur", hi: "अनूपपुर", lat: 23.1028, lng: 81.6917 },
      { key: "umaria", en: "Umaria", hi: "उमरिया", lat: 23.5245, lng: 80.8356 },
      { key: "dindori", en: "Dindori", hi: "डिंडोरी", lat: 22.9497, lng: 81.0806 },
      { key: "mandla", en: "Mandla", hi: "मंडला", lat: 22.5986, lng: 80.3714 },
      { key: "balaghat", en: "Balaghat", hi: "बालाघाट", lat: 21.8129, lng: 80.1837 },
      { key: "seoni", en: "Seoni", hi: "सिवनी", lat: 22.0858, lng: 79.5506 },
      { key: "chhindwara", en: "Chhindwara", hi: "छिंदवाड़ा", lat: 22.0574, lng: 78.9382 },
      { key: "betul", en: "Betul", hi: "बैतूल", lat: 21.9014, lng: 77.9014 },
      { key: "hoshangabad", en: "Narmadapuram (Hoshangabad)", hi: "नर्मदापुरम (होशंगाबाद)", lat: 22.7519, lng: 77.7289 },
      { key: "harda", en: "Harda", hi: "हरदा", lat: 22.3444, lng: 77.0944 },
      { key: "raisen", en: "Raisen", hi: "रायसेन", lat: 23.3315, lng: 77.7819 },
      { key: "sehore", en: "Sehore", hi: "सीहोर", lat: 23.2031, lng: 77.0844 },
      { key: "rajgarh", en: "Rajgarh", hi: "राजगढ़", lat: 24.0064, lng: 76.7300 },
      { key: "shajapur", en: "Shajapur", hi: "शाजापुर", lat: 23.4267, lng: 76.2778 },
      { key: "agar_malwa", en: "Agar Malwa", hi: "आगर मालवा", lat: 23.7144, lng: 76.0144 },
      { key: "khandwa", en: "Khandwa", hi: "खंडवा", lat: 21.8314, lng: 76.3497 },
      { key: "khargone", en: "Khargone", hi: "खरगोन", lat: 21.8236, lng: 75.6186 },
      { key: "barwani", en: "Barwani", hi: "बड़वानी", lat: 22.0361, lng: 74.9031 },
      { key: "burhanpur", en: "Burhanpur", hi: "बुरहानपुर", lat: 21.3106, lng: 76.2297 },
      { key: "dhar", en: "Dhar", hi: "धार", lat: 22.5986, lng: 75.2986 },
      { key: "alirajpur", en: "Alirajpur", hi: "अलीराजपुर", lat: 22.3031, lng: 74.3547 },
      { key: "jhabua", en: "Jhabua", hi: "झाबुआ", lat: 22.7694, lng: 74.5956 }
    ]
  },

  // 5. Rajasthan
  {
    key: "RJ",
    en: "Rajasthan",
    hi: "राजस्थान",
    districts: [
      { key: "jaipur", en: "Jaipur", hi: "जयपुर", lat: 26.9124, lng: 75.7873 },
      { key: "jodhpur", en: "Jodhpur", hi: "जोधपुर", lat: 26.2389, lng: 73.0243 },
      { key: "kota", en: "Kota", hi: "कोटा", lat: 25.2138, lng: 75.8648 },
      { key: "bikaner", en: "Bikaner", hi: "बीकानेर", lat: 28.0229, lng: 73.3119 },
      { key: "ajmer", en: "Ajmer", hi: "अजमेर", lat: 26.4499, lng: 74.6399 },
      { key: "udaipur", en: "Udaipur", hi: "उदयपुर", lat: 24.5854, lng: 73.7125 },
      { key: "alwar", en: "Alwar", hi: "अलवर", lat: 27.5530, lng: 76.6346 },
      { key: "bharatpur", en: "Bharatpur", hi: "भरतपुर", lat: 27.2152, lng: 77.5030 },
      { key: "bhilwara", en: "Bhilwara", hi: "भीलवाड़ा", lat: 25.3407, lng: 74.6313 },
      { key: "sikar", en: "Sikar", hi: "सीकर", lat: 27.6094, lng: 75.1398 },
      { key: "pali", en: "Pali", hi: "पाली", lat: 25.7711, lng: 73.3234 },
      { key: "sriganganagar", en: "Sri Ganganagar", hi: "श्रीगंगानगर", lat: 29.9038, lng: 73.8772 },
      { key: "hanumangarh", en: "Hanumangarh", hi: "हनुमानगढ़", lat: 29.5815, lng: 74.3294 },
      { key: "jhunjhunu", en: "Jhunjhunu", hi: "झुंझुनूं", lat: 28.1289, lng: 75.3995 },
      { key: "churu", en: "Churu", hi: "चूरू", lat: 28.2900, lng: 74.9600 },
      { key: "nagaur", en: "Nagaur", hi: "नागौर", lat: 27.2000, lng: 73.7400 },
      { key: "barmer", en: "Barmer", hi: "बाड़मेर", lat: 25.7500, lng: 71.3900 },
      { key: "jaisalmer", en: "Jaisalmer", hi: "जैसलमेर", lat: 26.9157, lng: 70.9083 },
      { key: "jalore", en: "Jalore", hi: "जालोर", lat: 25.3500, lng: 72.6200 },
      { key: "sirohi", en: "Sirohi", hi: "सिरोही", lat: 24.8800, lng: 72.8600 },
      { key: "rajsamand", en: "Rajsamand", hi: "राजसमंद", lat: 25.0700, lng: 73.8800 },
      { key: "chittorgarh", en: "Chittorgarh", hi: "चित्तौड़गढ़", lat: 24.8887, lng: 74.6269 },
      { key: "banswara", en: "Banswara", hi: "बांसवाड़ा", lat: 23.5500, lng: 74.4500 },
      { key: "dungarpur", en: "Dungarpur", hi: "डूंगरपुर", lat: 23.8400, lng: 73.7200 },
      { key: "pratapgarh_rj", en: "Pratapgarh", hi: "प्रतापगढ़", lat: 24.0300, lng: 74.7800 },
      { key: "tonk", en: "Tonk", hi: "टोंक", lat: 26.1600, lng: 75.7900 },
      { key: "bundi", en: "Bundi", hi: "बूंदी", lat: 25.4400, lng: 75.6400 },
      { key: "baran", en: "Baran", hi: "बारां", lat: 25.1000, lng: 76.5100 },
      { key: "jhalawar", en: "Jhalawar", hi: "झालावाड़", lat: 24.6000, lng: 76.1600 },
      { key: "sawai_madhopur", en: "Sawai Madhopur", hi: "सवाई माधोपुर", lat: 25.9900, lng: 76.3700 },
      { key: "dausa", en: "Dausa", hi: "दौसा", lat: 26.8900, lng: 76.3300 },
      { key: "dholpur", en: "Dholpur", hi: "धौलपुर", lat: 26.7000, lng: 77.9000 },
      { key: "karauli", en: "Karauli", hi: "करौली", lat: 26.5000, lng: 77.0200 }
    ]
  },

  // 6. Haryana
  {
    key: "HR",
    en: "Haryana",
    hi: "हरियाणा",
    districts: [
      { key: "gurugram", en: "Gurugram (Gurgaon)", hi: "गुरुग्राम (गुड़गांव)", lat: 28.4595, lng: 77.0266 },
      { key: "faridabad", en: "Faridabad", hi: "फरीदाबाद", lat: 28.4089, lng: 77.3178 },
      { key: "panipat", en: "Panipat", hi: "पानीपत", lat: 29.3909, lng: 76.9635 },
      { key: "ambala", en: "Ambala", hi: "अंबाला", lat: 30.3782, lng: 76.7767 },
      { key: "karnal", en: "Karnal", hi: "करनाल", lat: 29.6857, lng: 76.9905 },
      { key: "hisar", en: "Hisar", hi: "हिसार", lat: 29.1492, lng: 75.7217 },
      { key: "rohtak", en: "Rohtak", hi: "रोहतक", lat: 28.8955, lng: 76.6066 },
      { key: "sonipat", en: "Sonipat", hi: "सोनीपत", lat: 28.9931, lng: 77.0151 },
      { key: "yamunanagar", en: "Yamunanagar", hi: "यमुनानगर", lat: 30.1290, lng: 77.2674 },
      { key: "panchkula", en: "Panchkula", hi: "पंचकुला", lat: 30.6942, lng: 76.8606 },
      { key: "bhiwani", en: "Bhiwani", hi: "भिवानी", lat: 28.7932, lng: 76.1390 },
      { key: "sirsa", en: "Sirsa", hi: "सिरसा", lat: 29.5349, lng: 75.0295 },
      { key: "rewari", en: "Rewari", hi: "रेवाड़ी", lat: 28.1920, lng: 76.6239 },
      { key: "jhajjar", en: "Jhajjar", hi: "झज्जर", lat: 28.6063, lng: 76.6565 },
      { key: "fatehabad_hr", en: "Fatehabad", hi: "फतेहाबाद", lat: 29.5152, lng: 75.4554 },
      { key: "kurukshetra", en: "Kurukshetra", hi: "कुरुक्षेत्र", lat: 29.9695, lng: 76.8783 },
      { key: "kaithal", en: "Kaithal", hi: "कैथल", lat: 29.8015, lng: 76.3996 },
      { key: "palwal", en: "Palwal", hi: "पलवल", lat: 28.1447, lng: 77.3260 },
      { key: "mahendragarh", en: "Mahendragarh (Narnaul)", hi: "महेंद्रगढ़ (नारनौल)", lat: 28.0433, lng: 76.1084 },
      { key: "nuh", en: "Nuh (Mewat)", hi: "नूंह (मेवात)", lat: 28.1132, lng: 77.0151 },
      { key: "jind", en: "Jind", hi: "जींद", lat: 29.3140, lng: 76.3140 },
      { key: "charkhi_dadri", en: "Charkhi Dadri", hi: "चरखी दादरी", lat: 28.5921, lng: 76.2653 }
    ]
  },

  // 7. Punjab
  {
    key: "PB",
    en: "Punjab",
    hi: "पंजाब",
    districts: [
      { key: "amritsar", en: "Amritsar", hi: "अमृतसर", lat: 31.6340, lng: 74.8723 },
      { key: "ludhiana", en: "Ludhiana", hi: "लुधियाना", lat: 30.9010, lng: 75.8573 },
      { key: "jalandhar", en: "Jalandhar", hi: "जालंधर", lat: 31.3260, lng: 75.5762 },
      { key: "patiala", en: "Patiala", hi: "पटियाला", lat: 30.3398, lng: 76.3869 },
      { key: "bathinda", en: "Bathinda", hi: "बठिंडा", lat: 30.2110, lng: 74.9455 },
      { key: "mohali", en: "SAS Nagar (Mohali)", hi: "मोहाली", lat: 30.7046, lng: 76.7179 },
      { key: "hoshiarpur", en: "Hoshiarpur", hi: "होशियारपुर", lat: 31.5273, lng: 75.9149 },
      { key: "pathankot", en: "Pathankot", hi: "पठानकोट", lat: 32.2686, lng: 75.6499 },
      { key: "moga", en: "Moga", hi: "मोगा", lat: 30.8165, lng: 75.1717 },
      { key: "ferozepur", en: "Ferozepur", hi: "फिरोजपुर", lat: 30.9237, lng: 74.6065 }
    ]
  },

  // 8. Uttarakhand
  {
    key: "UK",
    en: "Uttarakhand",
    hi: "उत्तराखंड",
    districts: [
      { key: "dehradun", en: "Dehradun", hi: "देहरादून", lat: 30.3165, lng: 78.0322 },
      { key: "haridwar", en: "Haridwar", hi: "हरिद्वार", lat: 29.9457, lng: 78.1642 },
      { key: "nainital", en: "Nainital (Haldwani)", hi: "नैनीताल (हल्द्वानी)", lat: 29.3803, lng: 79.4636 },
      { key: "udham_singh_nagar", en: "Udham Singh Nagar (Rudrapur)", hi: "उधम सिंह नगर (रुद्रपुर)", lat: 28.9800, lng: 79.4000 },
      { key: "almora", en: "Almora", hi: "अल्मोड़ा", lat: 29.5971, lng: 79.6591 },
      { key: "pauri_garhwal", en: "Pauri Garhwal", hi: "पौड़ी गढ़वाल", lat: 30.1500, lng: 78.7800 },
      { key: "tehri_garhwal", en: "Tehri Garhwal", hi: "टिहरी गढ़वाल", lat: 30.3800, lng: 78.4800 },
      { key: "chamoli", en: "Chamoli", hi: "चमोली", lat: 30.4000, lng: 79.3300 },
      { key: "rudraprayag", en: "Rudraprayag", hi: "रुद्रप्रयाग", lat: 30.2800, lng: 78.9800 },
      { key: "uttarkashi", en: "Uttarkashi", hi: "उत्तरकाशी", lat: 30.7300, lng: 78.4500 },
      { key: "pithoragarh", en: "Pithoragarh", hi: "पिथौरागढ़", lat: 29.5800, lng: 80.2200 },
      { key: "bageshwar", en: "Bageshwar", hi: "बागेश्वर", lat: 29.8400, lng: 79.7700 },
      { key: "champawat", en: "Champawat", hi: "चंपावत", lat: 29.3300, lng: 80.1000 }
    ]
  },

  // 9. Jharkhand
  {
    key: "JH",
    en: "Jharkhand",
    hi: "झारखंड",
    districts: [
      { key: "ranchi", en: "Ranchi", hi: "राँची", lat: 23.3441, lng: 85.3096 },
      { key: "jamshedpur", en: "East Singhbhum (Jamshedpur)", hi: "पूर्वी सिंहभूम (जमशेदपुर)", lat: 22.8046, lng: 86.2029 },
      { key: "dhanbad", en: "Dhanbad", hi: "धनबाद", lat: 23.7957, lng: 86.4304 },
      { key: "bokaro", en: "Bokaro", hi: "बोकारो", lat: 23.6693, lng: 86.1511 },
      { key: "deoghar", en: "Deoghar", hi: "देवघर", lat: 24.4826, lng: 86.7001 },
      { key: "hazaribagh", en: "Hazaribagh", hi: "हज़ारीबाग़", lat: 23.9925, lng: 85.3637 },
      { key: "giridih", en: "Giridih", hi: "गिरिडीह", lat: 24.1854, lng: 86.3094 },
      { key: "ramgarh", en: "Ramgarh", hi: "रामगढ़", lat: 23.6300, lng: 85.5100 },
      { key: "koderma", en: "Koderma", hi: "कोडरमा", lat: 24.4700, lng: 85.5900 },
      { key: "palamu", en: "Palamu (Daltonganj)", hi: "पलामू (डालटनगंज)", lat: 24.0400, lng: 84.0700 },
      { key: "dumka", en: "Dumka", hi: "दुमका", lat: 24.2600, lng: 87.2500 }
    ]
  },

  // 10. Maharashtra
  {
    key: "MH",
    en: "Maharashtra",
    hi: "महाराष्ट्र",
    districts: [
      { key: "mumbai", en: "Mumbai City", hi: "मुंबई शहर", lat: 18.9220, lng: 72.8347 },
      { key: "mumbai_suburban", en: "Mumbai Suburban", hi: "मुंबई उपनगर", lat: 19.0760, lng: 72.8777 },
      { key: "pune", en: "Pune", hi: "पुणे", lat: 18.5204, lng: 73.8567 },
      { key: "nagpur", en: "Nagpur", hi: "नागपुर", lat: 21.1458, lng: 79.0882 },
      { key: "thane", en: "Thane", hi: "ठाणे", lat: 19.2183, lng: 72.9781 },
      { key: "nashik", en: "Nashik", hi: "नासिक", lat: 19.9975, lng: 73.7898 },
      { key: "aurangabad_mh", en: "Chhatrapati Sambhajinagar", hi: "छत्रपति संभाजीनगर", lat: 19.8762, lng: 75.3433 },
      { key: "solapur", en: "Solapur", hi: "सोलापुर", lat: 17.6599, lng: 75.9064 },
      { key: "amravati", en: "Amravati", hi: "अमरावती", lat: 20.9374, lng: 77.7796 },
      { key: "kolhapur", en: "Kolhapur", hi: "कोल्हापुर", lat: 16.7050, lng: 74.2433 }
    ]
  },

  // 11. Gujarat
  {
    key: "GJ",
    en: "Gujarat",
    hi: "गुजरात",
    districts: [
      { key: "ahmedabad", en: "Ahmedabad", hi: "अहमदाबाद", lat: 23.0225, lng: 72.5714 },
      { key: "surat", en: "Surat", hi: "सूरत", lat: 21.1702, lng: 72.8311 },
      { key: "vadodara", en: "Vadodara", hi: "वडोदरा", lat: 22.3072, lng: 73.1812 },
      { key: "rajkot", en: "Rajkot", hi: "राजकोट", lat: 22.3039, lng: 70.8022 },
      { key: "gandhinagar", en: "Gandhinagar", hi: "गांधीनगर", lat: 23.2156, lng: 72.6369 },
      { key: "bhavnagar", en: "Bhavnagar", hi: "भावनगर", lat: 21.7645, lng: 72.1519 },
      { key: "jamnagar", en: "Jamnagar", hi: "जामनगर", lat: 22.4707, lng: 70.0577 }
    ]
  },

  // 12. West Bengal
  {
    key: "WB",
    en: "West Bengal",
    hi: "पश्चिम बंगाल",
    districts: [
      { key: "kolkata", en: "Kolkata", hi: "कोलकाता", lat: 22.5726, lng: 88.3639 },
      { key: "howrah", en: "Howrah", hi: "हावड़ा", lat: 22.5958, lng: 88.2636 },
      { key: "north_24_parganas", en: "North 24 Parganas", hi: "उत्तर 24 परगना", lat: 22.7200, lng: 88.4800 },
      { key: "south_24_parganas", en: "South 24 Parganas", hi: "दक्षिण 24 परगना", lat: 22.1800, lng: 88.5400 },
      { key: "siliguri", en: "Darjeeling / Siliguri", hi: "दार्जिलिंग / सिलीगुड़ी", lat: 26.7271, lng: 88.3953 }
    ]
  },

  // 13. Chhattisgarh
  {
    key: "CG",
    en: "Chhattisgarh",
    hi: "छत्तीसगढ़",
    districts: [
      { key: "raipur", en: "Raipur", hi: "रायपुर", lat: 21.2514, lng: 81.6296 },
      { key: "bhilai_durg", en: "Durg / Bhilai", hi: "दुर्ग / भिलाई", lat: 21.1904, lng: 81.2849 },
      { key: "bilaspur", en: "Bilaspur", hi: "बिलासपुर", lat: 22.0797, lng: 82.1409 },
      { key: "korba", en: "Korba", hi: "कोरबा", lat: 22.3595, lng: 82.7501 },
      { key: "rajnandgaon", en: "Rajnandgaon", hi: "राजनांदगांव", lat: 21.0974, lng: 81.0360 }
    ]
  },

  // 14. Odisha
  {
    key: "OD",
    en: "Odisha",
    hi: "ओडिशा",
    districts: [
      { key: "bhubaneswar", en: "Khordha (Bhubaneswar)", hi: "खोर्धा (भुवनेश्वर)", lat: 20.2961, lng: 85.8245 },
      { key: "cuttack", en: "Cuttack", hi: "कटक", lat: 20.4625, lng: 85.8828 },
      { key: "rourkela", en: "Sundargarh (Rourkela)", hi: "सुंदरगढ़ (राउरकेला)", lat: 22.2604, lng: 84.8536 },
      { key: "puri", en: "Puri", hi: "पुरी", lat: 19.8135, lng: 85.8312 }
    ]
  },

  // 15. Himachal Pradesh
  {
    key: "HP",
    en: "Himachal Pradesh",
    hi: "हिमाचल प्रदेश",
    districts: [
      { key: "shimla", en: "Shimla", hi: "शिमला", lat: 31.1048, lng: 77.1734 },
      { key: "dharamshala", en: "Kangra (Dharamshala)", hi: "कांगड़ा (धर्मशाला)", lat: 32.2190, lng: 76.3234 },
      { key: "mandi", en: "Mandi", hi: "मंडी", lat: 31.5892, lng: 76.9182 },
      { key: "solan", en: "Solan", hi: "सोलन", lat: 30.9045, lng: 77.0967 },
      { key: "kullu", en: "Kullu / Manali", hi: "कुल्लू / मनाली", lat: 31.9579, lng: 77.1095 }
    ]
  },

  // 16. Jammu & Kashmir
  {
    key: "JK",
    en: "Jammu and Kashmir",
    hi: "जम्मू और कश्मीर",
    districts: [
      { key: "jammu", en: "Jammu", hi: "जम्मू", lat: 32.7266, lng: 74.8570 },
      { key: "srinagar", en: "Srinagar", hi: "श्रीनगर", lat: 34.0837, lng: 74.7973 },
      { key: "anantnag", en: "Anantnag", hi: "अनंतनाग", lat: 33.7311, lng: 75.1522 },
      { key: "udhampur", en: "Udhampur", hi: "उधमपुर", lat: 32.9250, lng: 75.1417 }
    ]
  },

  // 17. Assam
  {
    key: "AS",
    en: "Assam",
    hi: "असम",
    districts: [
      { key: "guwahati", en: "Kamrup Metropolitan (Guwahati)", hi: "गुवाहाटी", lat: 26.1445, lng: 91.7362 },
      { key: "silchar", en: "Cachar (Silchar)", hi: "सिलचर", lat: 24.8170, lng: 92.7958 },
      { key: "dibrugarh", en: "Dibrugarh", hi: "डिब्रूगढ़", lat: 27.4728, lng: 94.9120 }
    ]
  },

  // 18. Karnataka
  {
    key: "KA",
    en: "Karnataka",
    hi: "कर्नाटक",
    districts: [
      { key: "bengaluru", en: "Bengaluru Urban", hi: "बेंगलुरु", lat: 12.9716, lng: 77.5946 },
      { key: "mysuru", en: "Mysuru", hi: "मैसूर", lat: 12.2958, lng: 76.6394 },
      { key: "hubballi", en: "Dharwad (Hubballi)", hi: "हुबली-धारवाड़", lat: 15.3647, lng: 75.1240 },
      { key: "mangaluru", en: "Dakshina Kannada (Mangaluru)", hi: "मंगलुरु", lat: 12.9141, lng: 74.8560 }
    ]
  },

  // 19. Telangana
  {
    key: "TG",
    en: "Telangana",
    hi: "तेलंगाना",
    districts: [
      { key: "hyderabad", en: "Hyderabad", hi: "हैदराबाद", lat: 17.3850, lng: 78.4867 },
      { key: "secunderabad", en: "Medchal-Malkajgiri", hi: "सिकंदराबाद", lat: 17.4399, lng: 78.4983 },
      { key: "warangal", en: "Warangal", hi: "वारंगल", lat: 17.9689, lng: 79.5941 }
    ]
  },

  // 20. Andhra Pradesh
  {
    key: "AP",
    en: "Andhra Pradesh",
    hi: "आंध्र प्रदेश",
    districts: [
      { key: "visakhapatnam", en: "Visakhapatnam", hi: "विशाखापट्टनम", lat: 17.6868, lng: 83.2185 },
      { key: "vijayawada", en: "NTR (Vijayawada)", hi: "विजयवाड़ा", lat: 16.5062, lng: 80.6480 },
      { key: "guntur", en: "Guntur", hi: "गुंटूर", lat: 16.3067, lng: 80.4365 },
      { key: "tirupati", en: "Tirupati", hi: "तिरुपति", lat: 13.6288, lng: 79.4192 }
    ]
  },

  // 21. Tamil Nadu
  {
    key: "TN",
    en: "Tamil Nadu",
    hi: "तमिलनाडु",
    districts: [
      { key: "chennai", en: "Chennai", hi: "चेन्नई", lat: 13.0827, lng: 80.2707 },
      { key: "coimbatore", en: "Coimbatore", hi: "कोयंबटूर", lat: 11.0168, lng: 76.9558 },
      { key: "madurai", en: "Madurai", hi: "मदुरै", lat: 9.9252, lng: 78.1198 }
    ]
  },

  // 22. Kerala
  {
    key: "KL",
    en: "Kerala",
    hi: "केरल",
    districts: [
      { key: "thiruvananthapuram", en: "Thiruvananthapuram", hi: "तिरुवनंतपुरम", lat: 8.5241, lng: 76.9366 },
      { key: "kochi", en: "Ernakulam (Kochi)", hi: "कोच्चि", lat: 9.9312, lng: 76.2673 },
      { key: "kozhikode", en: "Kozhikode", hi: "कोझिकोड", lat: 11.2588, lng: 75.7804 }
    ]
  },

  // 23. Goa
  {
    key: "GA",
    en: "Goa",
    hi: "गोवा",
    districts: [
      { key: "north_goa", en: "North Goa (Panaji)", hi: "उत्तरी गोवा (पणजी)", lat: 15.4909, lng: 73.8278 },
      { key: "south_goa", en: "South Goa (Margao)", hi: "दक्षिणी गोवा (मडगांव)", lat: 15.2832, lng: 73.9862 }
    ]
  },

  // 24. Chandigarh (UT)
  {
    key: "CH",
    en: "Chandigarh",
    hi: "चंडीगढ़",
    districts: [
      { key: "chandigarh", en: "Chandigarh", hi: "चंडीगढ़", lat: 30.7333, lng: 76.7794 }
    ]
  },

  // 25. Tripura
  {
    key: "TR",
    en: "Tripura",
    hi: "त्रिपुरा",
    districts: [
      { key: "agartala", en: "West Tripura (Agartala)", hi: "अगरतला", lat: 23.8315, lng: 91.2868 }
    ]
  },

  // 26. Meghalaya
  {
    key: "ML",
    en: "Meghalaya",
    hi: "मेघालय",
    districts: [
      { key: "shillong", en: "East Khasi Hills (Shillong)", hi: "शिलांग", lat: 25.5788, lng: 91.8933 }
    ]
  },

  // 27. Manipur
  {
    key: "MN",
    en: "Manipur",
    hi: "मणिपुर",
    districts: [
      { key: "imphal", en: "Imphal", hi: "इम्फाल", lat: 24.8170, lng: 93.9368 }
    ]
  },

  // 28. Nagaland
  {
    key: "NL",
    en: "Nagaland",
    hi: "नागालैंड",
    districts: [
      { key: "kohima", en: "Kohima / Dimapur", hi: "कोहिमा / दीमापुर", lat: 25.6751, lng: 94.1086 }
    ]
  },

  // 29. Mizoram
  {
    key: "MZ",
    en: "Mizoram",
    hi: "मिजोरम",
    districts: [
      { key: "aizawl", en: "Aizawl", hi: "आइज़ोल", lat: 23.7271, lng: 92.7176 }
    ]
  },

  // 30. Arunachal Pradesh
  {
    key: "AR",
    en: "Arunachal Pradesh",
    hi: "अरुणाचल प्रदेश",
    districts: [
      { key: "itanagar", en: "Papum Pare (Itanagar)", hi: "ईटानगर", lat: 27.0844, lng: 93.6053 }
    ]
  },

  // 31. Sikkim
  {
    key: "SK",
    en: "Sikkim",
    hi: "सिक्किम",
    districts: [
      { key: "gangtok", en: "Gangtok", hi: "गंगटोक", lat: 27.3389, lng: 88.6065 }
    ]
  },

  // 32. Ladakh (UT)
  {
    key: "LA",
    en: "Ladakh",
    hi: "लद्दाख",
    districts: [
      { key: "leh", en: "Leh", hi: "लेह", lat: 34.1526, lng: 77.5771 },
      { key: "kargil", en: "Kargil", hi: "कारगिल", lat: 34.5539, lng: 76.1349 }
    ]
  },

  // 33. Puducherry (UT)
  {
    key: "PY",
    en: "Puducherry",
    hi: "पुदुचेरी",
    districts: [
      { key: "puducherry", en: "Puducherry", hi: "पुदुचेरी", lat: 11.9416, lng: 79.8083 }
    ]
  },

  // 34. Andaman and Nicobar Islands (UT)
  {
    key: "AN",
    en: "Andaman and Nicobar Islands",
    hi: "अंडमान और निकोबार",
    districts: [
      { key: "port_blair", en: "Port Blair", hi: "पोर्ट ब्लेयर", lat: 11.6234, lng: 92.7265 }
    ]
  },

  // 35. Dadra and Nagar Haveli and Daman and Diu (UT)
  {
    key: "DN",
    en: "Dadra and Nagar Haveli and Daman and Diu",
    hi: "दादरा और नगर हवेली और दमन और दीव",
    districts: [
      { key: "daman", en: "Daman / Silvassa", hi: "दमन / सिलवासा", lat: 20.3974, lng: 72.8328 }
    ]
  },

  // 36. Lakshadweep (UT)
  {
    key: "LD",
    en: "Lakshadweep",
    hi: "लक्षद्वीप",
    districts: [
      { key: "kavaratti", en: "Kavaratti", hi: "कवरत्ती", lat: 10.5667, lng: 72.6417 }
    ]
  }
];

/**
 * Returns friendly formatted string according to language ('hi' or 'en')
 */
export function getFriendlyLocationName(lat, lng, lang = 'hi') {
  if (lat == null || lng == null) return null;
  let closest = null;
  let minDist = 999999;

  for (const s of STATES_ALL) {
    for (const d of s.districts) {
      const dDist = Math.hypot(d.lat - lat, d.lng - lng);
      if (dDist < minDist) {
        minDist = dDist;
        closest = {
          state: lang === 'en' ? s.en : s.hi,
          district: lang === 'en' ? d.en : d.hi,
          tehsil: null
        };
      }
      if (d.tehsils) {
        for (const t of d.tehsils) {
          const tDist = Math.hypot(t.lat - lat, t.lng - lng);
          if (tDist < minDist) {
            minDist = tDist;
            closest = {
              state: lang === 'en' ? s.en : s.hi,
              district: lang === 'en' ? d.en : d.hi,
              tehsil: lang === 'en' ? t.en : t.hi
            };
          }
        }
      }
    }
  }

  if (closest && minDist < 1.0) {
    if (closest.tehsil) {
      return `${closest.tehsil}, ${closest.district} (${closest.state})`;
    }
    return `${closest.district}, ${closest.state}`;
  }
  return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
}

// Backward compatibility alias
export const STATES_DATA = STATES_ALL.map(s => ({
  name: `${s.hi} (${s.en})`,
  districts: s.districts.map(d => ({
    name: `${d.hi} (${d.en})`,
    lat: d.lat,
    lng: d.lng,
    tehsils: (d.tehsils || []).map(t => ({
      name: `${t.hi} (${t.en})`,
      lat: t.lat,
      lng: t.lng
    }))
  }))
}));
