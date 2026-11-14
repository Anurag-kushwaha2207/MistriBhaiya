/**
 * Comprehensive State -> District -> Tehsil dataset with geographical coordinates.
 * Covers primary user base (UP, Bihar, MP, Rajasthan, Delhi-NCR, Haryana, etc.)
 */

export const STATES_DATA = [
  {
    name: "उत्तर प्रदेश (Uttar Pradesh)",
    districts: [
      {
        name: "लखनऊ (Lucknow)",
        lat: 26.8467, lng: 80.9462,
        tehsils: [
          { name: "सदर (Sadar / Hazratganj)", lat: 26.8500, lng: 80.9400 },
          { name: "मोहनलालगंज (Mohanlalganj)", lat: 26.6800, lng: 80.9800 },
          { name: "बक्शी का तालाब (Bakshi Ka Talab)", lat: 26.9800, lng: 80.8900 },
          { name: "मलिहाबाद (Malihabad)", lat: 26.9200, lng: 80.7100 },
          { name: "सरोजनी नगर (Sarojini Nagar)", lat: 26.7500, lng: 80.8700 }
        ]
      },
      {
        name: "कानपुर नगर (Kanpur)",
        lat: 26.4499, lng: 80.3319,
        tehsils: [
          { name: "कानपुर सदर (Kanpur Sadar)", lat: 26.4600, lng: 80.3300 },
          { name: "बिल्हौर (Bilhaur)", lat: 26.8500, lng: 80.0500 },
          { name: "घाटमपुर (Ghatampur)", lat: 26.1500, lng: 80.1700 },
          { name: "नरवल (Narwal)", lat: 26.2800, lng: 80.4500 }
        ]
      },
      {
        name: "वाराणसी (Varanasi / Banaras)",
        lat: 25.3176, lng: 82.9739,
        tehsils: [
          { name: "वाराणसी सदर (Sadar)", lat: 25.3200, lng: 82.9800 },
          { name: "पिंडरा (Pindra)", lat: 25.5200, lng: 82.8300 },
          { name: "राजातालाब (Rajatalab)", lat: 25.2600, lng: 82.8700 }
        ]
      },
      {
        name: "प्रयागराज (Prayagraj / Allahabad)",
        lat: 25.4358, lng: 81.8463,
        tehsils: [
          { name: "प्रयागराज सदर (Sadar)", lat: 25.4400, lng: 81.8500 },
          { name: "फूलपुर (Phulpur)", lat: 25.5500, lng: 82.0800 },
          { name: "सोरांव (Soraon)", lat: 25.5800, lng: 81.8500 },
          { name: "करछना (Karchhana)", lat: 25.2800, lng: 81.9200 },
          { name: "मेजा (Meja)", lat: 25.1300, lng: 82.1200 },
          { name: "हंडिया (Handia)", lat: 25.3700, lng: 82.1800 },
          { name: "बारा (Bara)", lat: 25.2500, lng: 81.7200 },
          { name: "कोरांव (Koraon)", lat: 24.9800, lng: 82.0700 }
        ]
      },
      {
        name: "गोरखपुर (Gorakhpur)",
        lat: 26.7606, lng: 83.3732,
        tehsils: [
          { name: "गोरखपुर सदर (Sadar)", lat: 26.7600, lng: 83.3700 },
          { name: "सहजनवा (Sahjanwa)", lat: 26.7700, lng: 83.2000 },
          { name: "कैम्पियरगंज (Campierganj)", lat: 27.0200, lng: 83.2500 },
          { name: "बांसगांव (Bansgaon)", lat: 26.5500, lng: 83.3500 },
          { name: "खजनी (Khajni)", lat: 26.6300, lng: 83.2200 },
          { name: "चौरी चौरा (Chauri Chaura)", lat: 26.6500, lng: 83.5800 },
          { name: "गोला (Gola)", lat: 26.3300, lng: 83.3500 }
        ]
      },
      {
        name: "अयोध्या (Ayodhya / Faizabad)",
        lat: 26.7922, lng: 82.1998,
        tehsils: [
          { name: "अयोध्या सदर (Sadar)", lat: 26.7900, lng: 82.2000 },
          { name: "रुदौली (Rudauli)", lat: 26.7500, lng: 81.7500 },
          { name: "बीकापुर (Bikapur)", lat: 26.6000, lng: 82.1300 },
          { name: "सोहावल (Sohawal)", lat: 26.7700, lng: 82.0200 },
          { name: "मिल्कीपुर (Milkipur)", lat: 26.5800, lng: 81.9000 }
        ]
      },
      {
        name: "आगरा (Agra)",
        lat: 27.1767, lng: 78.0081,
        tehsils: [
          { name: "आगरा सदर (Sadar)", lat: 27.1800, lng: 78.0100 },
          { name: "फतेहाबाद (Fatehabad)", lat: 27.0200, lng: 78.3000 },
          { name: "खेरागढ़ (Kheragarh)", lat: 26.9500, lng: 77.8200 },
          { name: "एत्मादपुर (Etmadpur)", lat: 27.2300, lng: 78.2000 },
          { name: "बाह (Bah)", lat: 26.8700, lng: 78.6000 },
          { name: "किरावली (Kiraoli)", lat: 27.1500, lng: 77.7800 }
        ]
      },
      {
        name: "मेरठ (Meerut)",
        lat: 28.9845, lng: 77.7064,
        tehsils: [
          { name: "मेरठ सदर (Sadar)", lat: 28.9800, lng: 77.7000 },
          { name: "मवाना (Mawana)", lat: 29.1000, lng: 77.9200 },
          { name: "सरधना (Sardhana)", lat: 29.1500, lng: 77.6200 }
        ]
      },
      {
        name: "गाजियाबाद (Ghaziabad)",
        lat: 28.6692, lng: 77.4538,
        tehsils: [
          { name: "गाजियाबाद सदर (Sadar)", lat: 28.6700, lng: 77.4500 },
          { name: "मोदीनगर (Modinagar)", lat: 28.8300, lng: 77.5800 },
          { name: "लोनी (Loni)", lat: 28.7500, lng: 77.2800 }
        ]
      },
      {
        name: "गौतम बुद्ध नगर (Noida / Gr. Noida)",
        lat: 28.5355, lng: 77.3910,
        tehsils: [
          { name: "नोएडा (Noida)", lat: 28.5700, lng: 77.3200 },
          { name: "दादरी / ग्रेटर नोएडा (Dadri / Greater Noida)", lat: 28.5500, lng: 77.5500 },
          { name: "जेवर (Jewar)", lat: 28.1300, lng: 77.5500 }
        ]
      },
      {
        name: "बरेली (Bareilly)",
        lat: 28.3670, lng: 79.4304,
        tehsils: [
          { name: "बरेली सदर (Sadar)", lat: 28.3700, lng: 79.4300 },
          { name: "आंवला (Aonla)", lat: 28.2800, lng: 79.1700 },
          { name: "बहेड़ी (Baheri)", lat: 28.7800, lng: 79.5000 },
          { name: "फरीदपुर (Faridpur)", lat: 28.2000, lng: 79.5500 },
          { name: "नवाबगंज (Nawabganj)", lat: 28.5300, lng: 79.6300 },
          { name: "मीरगंज (Mirganj)", lat: 28.5500, lng: 79.2000 }
        ]
      },
      {
        name: "अलीगढ़ (Aligarh)",
        lat: 27.8974, lng: 78.0880,
        tehsils: [
          { name: "कोल (Koil / Sadar)", lat: 27.9000, lng: 78.0800 },
          { name: "खैर (Khair)", lat: 27.9500, lng: 77.8500 },
          { name: "अतरौली (Atrauli)", lat: 28.0300, lng: 78.2800 },
          { name: "इगलास (Iglas)", lat: 27.7200, lng: 77.9300 },
          { name: "गभाना (Gabhana)", lat: 28.0200, lng: 77.9500 }
        ]
      },
      {
        name: "झांसी (Jhansi)",
        lat: 25.4484, lng: 78.5685,
        tehsils: [
          { name: "झांसी सदर (Sadar)", lat: 25.4500, lng: 78.5700 },
          { name: "मोंठ (Moth)", lat: 25.7200, lng: 78.9500 },
          { name: "मऊरानीपुर (Mauranipur)", lat: 25.2500, lng: 79.1300 },
          { name: "गरौठा (Garautha)", lat: 25.5700, lng: 79.3000 },
          { name: "टहरौली (Tahrauli)", lat: 25.4000, lng: 79.0300 }
        ]
      },
      {
        name: "मुरादाबाद (Moradabad)",
        lat: 28.8386, lng: 78.7733,
        tehsils: [
          { name: "मुरादाबाद सदर (Sadar)", lat: 28.8400, lng: 78.7700 },
          { name: "बिलारी (Bilari)", lat: 28.6200, lng: 78.8000 },
          { name: "कांठ (Kanth)", lat: 29.0500, lng: 78.6200 }
        ]
      },
      {
        name: "सहारनपुर (Saharanpur)",
        lat: 29.9678, lng: 77.5460,
        tehsils: [
          { name: "सहारनपुर सदर (Sadar)", lat: 29.9700, lng: 77.5500 },
          { name: "देवबंद (Deoband)", lat: 29.7000, lng: 77.6800 },
          { name: "बेहट (Behat)", lat: 30.1700, lng: 77.6200 },
          { name: "नकुड़ (Nakur)", lat: 29.8700, lng: 77.3000 },
          { name: "रामपुर मनिहारान (Rampur Maniharan)", lat: 29.8000, lng: 77.4500 }
        ]
      },
      {
        name: "मथुरा (Mathura)",
        lat: 27.4924, lng: 77.6737,
        tehsils: [
          { name: "मथुरा सदर (Sadar)", lat: 27.4900, lng: 77.6700 },
          { name: "छाता (Chhata)", lat: 27.7200, lng: 77.5000 },
          { name: "मांट (Mant)", lat: 27.6000, lng: 77.7200 },
          { name: "महावन (Mahavan)", lat: 27.4300, lng: 77.7800 },
          { name: "गोवर्धन (Goverdhan)", lat: 27.5000, lng: 77.4700 }
        ]
      },
      {
        name: "बस्ती (Basti)",
        lat: 26.8140, lng: 82.7630,
        tehsils: [
          { name: "बस्ती सदर (Sadar)", lat: 26.8100, lng: 82.7600 },
          { name: "हर्रैया (Harraiya)", lat: 26.8000, lng: 82.5200 },
          { name: "भानपुर (Bhanpur)", lat: 27.0200, lng: 82.7800 },
          { name: "रुधौली (Rudhauli)", lat: 27.0000, lng: 82.9000 }
        ]
      },
      {
        name: "आजमगढ़ (Azamgarh)",
        lat: 26.0738, lng: 83.1859,
        tehsils: [
          { name: "सदर (Sadar)", lat: 26.0700, lng: 83.1800 },
          { name: "सगड़ी (Sagri)", lat: 26.2000, lng: 83.2700 },
          { name: "लालगंज (Lalganj)", lat: 25.8000, lng: 83.0000 },
          { name: "मेंहनगर (Mehnagar)", lat: 25.8800, lng: 83.1500 },
          { name: "निजामाबाद (Nizamabad)", lat: 26.0500, lng: 83.0500 },
          { name: "फूलपुर (Phoolpur)", lat: 26.0800, lng: 82.8800 },
          { name: "बूढ़नपुर (Budhanpur)", lat: 26.2300, lng: 83.0000 }
        ]
      },
      {
        name: "जौनपुर (Jaunpur)",
        lat: 25.7464, lng: 82.6837,
        tehsils: [
          { name: "जौनपुर सदर (Sadar)", lat: 25.7500, lng: 82.6800 },
          { name: "शाहगंज (Shahganj)", lat: 26.0500, lng: 82.7000 },
          { name: "मछलीशहर (Machhlishahr)", lat: 25.6800, lng: 82.4200 },
          { name: "बदलापुर (Badlapur)", lat: 25.9000, lng: 82.4700 },
          { name: "मड़ियाहूं (Mariahu)", lat: 25.6000, lng: 82.6200 },
          { name: "केराकत (Kerakat)", lat: 25.6300, lng: 82.9200 }
        ]
      },
      {
        name: "सीतापुर (Sitapur)",
        lat: 27.5684, lng: 80.6829,
        tehsils: [
          { name: "सीतापुर सदर (Sadar)", lat: 27.5700, lng: 80.6800 },
          { name: "बिसवां (Biswan)", lat: 27.5000, lng: 81.0000 },
          { name: "महमूदाबाद (Mahmudabad)", lat: 27.3000, lng: 81.1200 },
          { name: "लहरपुर (Laharpur)", lat: 27.7200, lng: 80.9000 },
          { name: "मिश्रिख (Misrikh)", lat: 27.4300, lng: 80.5200 },
          { name: "सिधौली (Sidhauli)", lat: 27.2800, lng: 80.8300 }
        ]
      },
      {
        name: "हरदोई (Hardoi)",
        lat: 27.3992, lng: 80.1311,
        tehsils: [
          { name: "हरदोई सदर (Sadar)", lat: 27.4000, lng: 80.1300 },
          { name: "शाहाबाद (Shahabad)", lat: 27.6500, lng: 79.9300 },
          { name: "बिलग्राम (Bilgram)", lat: 27.1800, lng: 80.0300 },
          { name: "संडीला (Sandila)", lat: 27.0800, lng: 80.5200 },
          { name: "सवायजपुर (Sawayajpur)", lat: 27.4700, lng: 79.8800 }
        ]
      },
      {
        name: "उन्नाव (Unnao)",
        lat: 26.5479, lng: 80.4905,
        tehsils: [
          { name: "उन्नाव सदर (Sadar)", lat: 26.5500, lng: 80.4900 },
          { name: "सफीपुर (Safipur)", lat: 26.7300, lng: 80.3500 },
          { name: "पुरवा (Purwa)", lat: 26.4700, lng: 80.7700 },
          { name: "हसनगंज (Hasanganj)", lat: 26.7800, lng: 80.6500 },
          { name: "बांगरमऊ (Bangarmau)", lat: 26.9000, lng: 80.2200 },
          { name: "बीघापुर (Bighapur)", lat: 26.3500, lng: 80.6800 }
        ]
      },
      {
        name: "बाराबंकी (Barabanki)",
        lat: 26.9268, lng: 81.1834,
        tehsils: [
          { name: "नवाबगंज सदर (Nawabganj / Sadar)", lat: 26.9300, lng: 81.1800 },
          { name: "फतेहपुर (Fatehpur)", lat: 27.1700, lng: 81.2200 },
          { name: "हैदरगढ़ (Haidergarh)", lat: 26.5800, lng: 81.4200 },
          { name: "रामनगर (Ramnagar)", lat: 27.0800, lng: 81.4000 },
          { name: "रामसनेही घाट (Ramsanehighat)", lat: 26.8000, lng: 81.5500 },
          { name: "सिरौली गौसपुर (Sirauli Ghauspur)", lat: 26.9500, lng: 81.5200 }
        ]
      },
      {
        name: "सुलतानपुर (Sultanpur)",
        lat: 26.2648, lng: 82.0727,
        tehsils: [
          { name: "सुलतानपुर सदर (Sadar)", lat: 26.2600, lng: 82.0700 },
          { name: "कादीपुर (Kadipur)", lat: 26.1700, lng: 82.3800 },
          { name: "लंभुआ (Lambhua)", lat: 26.1300, lng: 82.2000 },
          { name: "जयसिंहपुर (Jaisinghpur)", lat: 26.2300, lng: 82.2800 }
        ]
      },
      {
        name: "रायबरेली (Raebareli)",
        lat: 26.2236, lng: 81.2409,
        tehsils: [
          { name: "रायबरेली सदर (Sadar)", lat: 26.2200, lng: 81.2400 },
          { name: "लालगंज (Lalganj)", lat: 26.1700, lng: 80.9700 },
          { name: "महाराजगंज (Maharajganj)", lat: 26.3800, lng: 81.2800 },
          { name: "सलोन (Salon)", lat: 26.0300, lng: 81.4500 },
          { name: "ऊंचाहार (Unchahar)", lat: 25.9200, lng: 81.3000 }
        ]
      }
    ]
  },
  {
    name: "बिहार (Bihar)",
    districts: [
      {
        name: "पटना (Patna)",
        lat: 25.5941, lng: 85.1376,
        tehsils: [
          { name: "पटना सदर (Patna Sadar)", lat: 25.6000, lng: 85.1400 },
          { name: "दानापुर (Danapur)", lat: 25.6300, lng: 85.0500 },
          { name: "बाढ़ (Barh)", lat: 25.4800, lng: 85.7200 },
          { name: "मसौढ़ी (Masaurhi)", lat: 25.3500, lng: 85.0300 },
          { name: "पालीगंज (Paliganj)", lat: 25.3300, lng: 84.8200 },
          { name: "बख्तियारपुर (Bakhtiyarpur)", lat: 25.4500, lng: 85.5300 },
          { name: "फुलवारी शरीफ (Phulwari Sharif)", lat: 25.5800, lng: 85.0800 }
        ]
      },
      {
        name: "गया (Gaya)",
        lat: 24.7914, lng: 85.0002,
        tehsils: [
          { name: "गया सदर (Sadar)", lat: 24.7900, lng: 85.0000 },
          { name: "शेरघाटी (Sherghati)", lat: 24.5700, lng: 84.8000 },
          { name: "टिकारी (Tekari)", lat: 24.9300, lng: 84.8300 },
          { name: "नीमचक बथानी (Neemchak Bathani)", lat: 24.9700, lng: 85.2500 }
        ]
      },
      {
        name: "मुजफ्फरपुर (Muzaffarpur)",
        lat: 26.1209, lng: 85.3647,
        tehsils: [
          { name: "मुजफ्फरपुर सदर (Sadar / East)", lat: 26.1200, lng: 85.3700 },
          { name: "कांटी (Kanti)", lat: 26.2000, lng: 85.3000 },
          { name: "मोतीपुर (Motipur)", lat: 26.2800, lng: 85.1800 },
          { name: "साहेबगंज (Sahebganj)", lat: 26.2500, lng: 85.0200 },
          { name: "सकरा (Sakra)", lat: 25.9800, lng: 85.5200 },
          { name: "मड़वन (Marwan)", lat: 26.1000, lng: 85.2700 }
        ]
      },
      {
        name: "भागलपुर (Bhagalpur)",
        lat: 25.2425, lng: 86.9842,
        tehsils: [
          { name: "भागलपुर सदर (Sadar)", lat: 25.2400, lng: 86.9800 },
          { name: "कहलगांव (Kahalgaon)", lat: 25.2700, lng: 87.2300 },
          { name: "नवगछिया (Naugachhia)", lat: 25.3800, lng: 87.1000 }
        ]
      },
      {
        name: "दरभंगा (Darbhanga)",
        lat: 26.1542, lng: 85.8918,
        tehsils: [
          { name: "दरभंगा सदर (Sadar)", lat: 26.1500, lng: 85.8900 },
          { name: "बेनीपुर (Benipur)", lat: 26.0500, lng: 86.1300 },
          { name: "बिरौल (Biraul)", lat: 25.9700, lng: 86.1800 }
        ]
      },
      {
        name: "सारण / छपरा (Saran / Chhapra)",
        lat: 25.7796, lng: 84.7499,
        tehsils: [
          { name: "छपरा सदर (Sadar)", lat: 25.7800, lng: 84.7500 },
          { name: "मढ़ौरा (Marhaura)", lat: 25.9700, lng: 84.8700 },
          { name: "सोनपुर (Sonpur)", lat: 25.7000, lng: 85.1800 }
        ]
      },
      {
        name: "सीवान (Siwan)",
        lat: 26.2196, lng: 84.3567,
        tehsils: [
          { name: "सीवान सदर (Sadar)", lat: 26.2200, lng: 84.3600 },
          { name: "महाराजगंज (Maharajganj)", lat: 26.1200, lng: 84.5000 }
        ]
      },
      {
        name: "गोपालगंज (Gopalganj)",
        lat: 26.4674, lng: 84.4442,
        tehsils: [
          { name: "गोपालगंज सदर (Sadar)", lat: 26.4700, lng: 84.4400 },
          { name: "हथुआ (Hathua)", lat: 26.3500, lng: 84.3000 }
        ]
      },
      {
        name: "नालंदा (Nalanda / Bihar Sharif)",
        lat: 25.1982, lng: 85.5149,
        tehsils: [
          { name: "बिहारशरीफ (Bihar Sharif)", lat: 25.2000, lng: 85.5200 },
          { name: "राजगीर (Rajgir)", lat: 25.0300, lng: 85.4200 },
          { name: "हिलसा (Hilsa)", lat: 25.3200, lng: 85.2800 }
        ]
      },
      {
        name: "रोहतास (Rohtas / Sasaram)",
        lat: 24.9515, lng: 84.0315,
        tehsils: [
          { name: "सासाराम (Sasaram)", lat: 24.9500, lng: 84.0300 },
          { name: "डेहरी (Dehri)", lat: 24.9000, lng: 84.1800 },
          { name: "बिक्रमगंज (Bikramganj)", lat: 25.2000, lng: 84.2500 }
        ]
      }
    ]
  },
  {
    name: "मध्य प्रदेश (Madhya Pradesh)",
    districts: [
      {
        name: "भोपाल (Bhopal)",
        lat: 23.2599, lng: 77.4126,
        tehsils: [
          { name: "हुजूर (Huzur / Bhopal City)", lat: 23.2600, lng: 77.4100 },
          { name: "बैरसिया (Berasia)", lat: 23.6300, lng: 77.4300 },
          { name: "कोलार (Kolar)", lat: 23.1800, lng: 77.4200 }
        ]
      },
      {
        name: "इंदौर (Indore)",
        lat: 22.7196, lng: 75.8577,
        tehsils: [
          { name: "इंदौर (Indore City)", lat: 22.7200, lng: 75.8600 },
          { name: "महू / डॉ. आंबेडकर नगर (Mhow)", lat: 22.5500, lng: 75.7500 },
          { name: "सांवेर (Sanwer)", lat: 22.9700, lng: 75.8300 },
          { name: "देपालपुर (Depalpur)", lat: 22.8500, lng: 75.5500 },
          { name: "हातोद (Hatod)", lat: 22.8000, lng: 75.7200 }
        ]
      },
      {
        name: "ग्वालियर (Gwalior)",
        lat: 26.2183, lng: 78.1828,
        tehsils: [
          { name: "ग्वालियर (Gwalior City)", lat: 26.2200, lng: 78.1800 },
          { name: "डबरा (Dabra)", lat: 25.8800, lng: 78.3300 },
          { name: "भितरवार (Bhitarwar)", lat: 25.8000, lng: 78.1200 },
          { name: "चिनौर (Chinor)", lat: 26.0200, lng: 78.0700 }
        ]
      },
      {
        name: "जबलपुर (Jabalpur)",
        lat: 23.1815, lng: 79.9864,
        tehsils: [
          { name: "जबलपुर (Jabalpur City)", lat: 23.1800, lng: 79.9900 },
          { name: "पाटन (Patan)", lat: 23.2800, lng: 79.7000 },
          { name: "सिहोरा (Sihora)", lat: 23.4800, lng: 80.1200 },
          { name: "पनागर (Panagar)", lat: 23.3000, lng: 80.0000 },
          { name: "मझोली (Majholi)", lat: 23.5300, lng: 79.9200 },
          { name: "शाहपुरा (Shahpura)", lat: 23.1300, lng: 79.6700 }
        ]
      },
      {
        name: "उज्जैन (Ujjain)",
        lat: 23.1765, lng: 75.7885,
        tehsils: [
          { name: "उज्जैन (Ujjain City)", lat: 23.1800, lng: 75.7900 },
          { name: "नागदा (Nagda)", lat: 23.4500, lng: 75.4200 },
          { name: "बड़नगर (Badnagar)", lat: 23.0700, lng: 75.3800 },
          { name: "महिदपुर (Mahidpur)", lat: 23.4800, lng: 75.6500 },
          { name: "तराना (Tarana)", lat: 23.3300, lng: 76.0300 },
          { name: "खाचरोद (Khachrod)", lat: 23.4200, lng: 75.2800 }
        ]
      },
      {
        name: "रीवा (Rewa)",
        lat: 24.5362, lng: 81.3037,
        tehsils: [
          { name: "हुजूर (Huzur / Rewa City)", lat: 24.5400, lng: 81.3000 },
          { name: "रायपुर कर्चुलियान (Raipur Karchuliyan)", lat: 24.5700, lng: 81.5200 },
          { name: "मऊगंज (Mauganj)", lat: 24.6800, lng: 81.8700 },
          { name: "हनुमना (Hanumana)", lat: 24.7700, lng: 82.0800 },
          { name: "त्योंथर (Teonthar)", lat: 24.9800, lng: 81.6500 }
        ]
      },
      {
        name: "सागर (Sagar)",
        lat: 23.8388, lng: 78.7378,
        tehsils: [
          { name: "सागर (Sagar City)", lat: 23.8400, lng: 78.7400 },
          { name: "खुरई (Khurai)", lat: 24.0500, lng: 78.3300 },
          { name: "बीना (Bina)", lat: 24.1800, lng: 78.1800 },
          { name: "बंडा (Banda)", lat: 24.0500, lng: 78.9500 },
          { name: "रहली (Rehli)", lat: 23.6300, lng: 79.0700 }
        ]
      }
    ]
  },
  {
    name: "राजस्थान (Rajasthan)",
    districts: [
      {
        name: "जयपुर (Jaipur)",
        lat: 26.9124, lng: 75.7873,
        tehsils: [
          { name: "जयपुर (Jaipur City)", lat: 26.9100, lng: 75.7900 },
          { name: "सांगानेर (Sanganer)", lat: 26.8200, lng: 75.7800 },
          { name: "आमेर (Amer)", lat: 26.9900, lng: 75.8500 },
          { name: "बस्सी (Bassi)", lat: 26.8300, lng: 76.0500 },
          { name: "चौमूं (Chomu)", lat: 27.1700, lng: 75.7200 },
          { name: "कोटपूतली (Kotputli)", lat: 27.7000, lng: 76.2000 },
          { name: "चाकसू (Chaksu)", lat: 26.6000, lng: 75.9500 }
        ]
      },
      {
        name: "जोधपुर (Jodhpur)",
        lat: 26.2389, lng: 73.0243,
        tehsils: [
          { name: "जोधपुर (Jodhpur City)", lat: 26.2400, lng: 73.0200 },
          { name: "लूणी (Luni)", lat: 26.0200, lng: 73.0000 },
          { name: "बिलाड़ा (Bilara)", lat: 26.1800, lng: 73.7000 },
          { name: "ओसियां (Osian)", lat: 26.7200, lng: 72.9000 },
          { name: "फलोदी (Phalodi)", lat: 27.1300, lng: 72.3700 }
        ]
      },
      {
        name: "कोटा (Kota)",
        lat: 25.2138, lng: 75.8648,
        tehsils: [
          { name: "लाडपुरा / कोटा (Ladpura / Kota City)", lat: 25.2100, lng: 75.8600 },
          { name: "रामगंज मंडी (Ramganj Mandi)", lat: 24.6500, lng: 75.9500 },
          { name: "सांगोद (Sangod)", lat: 24.9200, lng: 76.2800 },
          { name: "इटावा (Itawa)", lat: 25.5000, lng: 76.5000 }
        ]
      },
      {
        name: "उदयपुर (Udaipur)",
        lat: 24.5854, lng: 73.7125,
        tehsils: [
          { name: "गिर्वा / उदयपुर (Girwa / Udaipur City)", lat: 24.5900, lng: 73.7100 },
          { name: "मावली (Mavli)", lat: 24.7800, lng: 73.9800 },
          { name: "वल्लभनगर (Vallabhnagar)", lat: 24.6700, lng: 74.0000 },
          { name: "गोगुंदा (Gogunda)", lat: 24.7700, lng: 73.5300 },
          { name: "सलूम्बर (Salumbar)", lat: 24.1300, lng: 74.0500 }
        ]
      },
      {
        name: "अलवर (Alwar)",
        lat: 27.5530, lng: 76.6346,
        tehsils: [
          { name: "अलवर (Alwar City)", lat: 27.5500, lng: 76.6300 },
          { name: "बहरोड़ (Behror)", lat: 27.8800, lng: 76.2800 },
          { name: "तिजारा / भिवाड़ी (Tijara / Bhiwadi)", lat: 28.1200, lng: 76.8500 },
          { name: "राजगढ़ (Rajgarh)", lat: 27.2300, lng: 76.6200 },
          { name: "किशनगढ़ बास (Kishangarh Bas)", lat: 27.8200, lng: 76.7200 }
        ]
      }
    ]
  },
  {
    name: "दिल्ली / एनसीआर (Delhi / NCR)",
    districts: [
      {
        name: "मध्य दिल्ली (Central Delhi)",
        lat: 28.6448, lng: 77.2167,
        tehsils: [
          { name: "दरियागंज (Daryaganj)", lat: 28.6400, lng: 77.2400 },
          { name: "कनॉट प्लेस (Connaught Place)", lat: 28.6300, lng: 77.2200 },
          { name: "सिविल लाइंस (Civil Lines)", lat: 28.6800, lng: 77.2200 },
          { name: "करोल बाग (Karol Bagh)", lat: 28.6500, lng: 77.1900 }
        ]
      },
      {
        name: "दक्षिण दिल्ली (South Delhi)",
        lat: 28.4817, lng: 77.1873,
        tehsils: [
          { name: "हौज खास (Hauz Khas)", lat: 28.5500, lng: 77.2000 },
          { name: "साकेत (Saket)", lat: 28.5200, lng: 77.2100 },
          { name: "महरौली (Mehrauli)", lat: 28.5100, lng: 77.1800 },
          { name: "डिफेंस कॉलोनी (Defence Colony)", lat: 28.5700, lng: 77.2300 },
          { name: "कालकाजी (Kalkaji)", lat: 28.5400, lng: 77.2500 }
        ]
      },
      {
        name: "पश्चिम दिल्ली (West Delhi)",
        lat: 28.6663, lng: 77.0674,
        tehsils: [
          { name: "राजौरी गार्डन (Rajouri Garden)", lat: 28.6500, lng: 77.1200 },
          { name: "पटेल नगर (Patel Nagar)", lat: 28.6500, lng: 77.1600 },
          { name: "पंजाबी बाग (Punjabi Bagh)", lat: 28.6700, lng: 77.1300 },
          { name: "द्वारका (Dwarka)", lat: 28.5900, lng: 77.0500 },
          { name: "जनकपुरी (Janakpuri)", lat: 28.6200, lng: 77.0800 }
        ]
      },
      {
        name: "पूर्वी दिल्ली (East Delhi)",
        lat: 28.6280, lng: 77.2950,
        tehsils: [
          { name: "प्रीत विहार (Preet Vihar)", lat: 28.6400, lng: 77.2900 },
          { name: "मयूर विहार (Mayur Vihar)", lat: 28.6000, lng: 77.3000 },
          { name: "गांधी नगर (Gandhi Nagar)", lat: 28.6600, lng: 77.2700 },
          { name: "शाहदरा (Shahdara)", lat: 28.6700, lng: 77.2900 }
        ]
      },
      {
        name: "उत्तर दिल्ली (North Delhi)",
        lat: 28.7300, lng: 77.1500,
        tehsils: [
          { name: "सदर बाजार (Sadar Bazar)", lat: 28.6600, lng: 77.2100 },
          { name: "रोहिणी (Rohini)", lat: 28.7100, lng: 77.1200 },
          { name: "नरेला (Narela)", lat: 28.8500, lng: 77.0900 },
          { name: "अलीपुर (Alipur)", lat: 28.8000, lng: 77.1300 }
        ]
      }
    ]
  },
  {
    name: "हरियाणा (Haryana)",
    districts: [
      {
        name: "गुरुग्राम (Gurugram / Gurgaon)",
        lat: 28.4595, lng: 77.0266,
        tehsils: [
          { name: "गुरुग्राम सदर (Gurugram)", lat: 28.4600, lng: 77.0300 },
          { name: "मानेसर (Manesar)", lat: 28.3500, lng: 76.9400 },
          { name: "सोहना (Sohna)", lat: 28.2500, lng: 77.0700 },
          { name: "पटौदी (Pataudi)", lat: 28.3200, lng: 76.7800 },
          { name: "बादशाहपुर (Badshahpur)", lat: 28.3800, lng: 77.0500 }
        ]
      },
      {
        name: "फरीदाबाद (Faridabad)",
        lat: 28.4089, lng: 77.3178,
        tehsils: [
          { name: "फरीदाबाद (Faridabad City)", lat: 28.4100, lng: 77.3200 },
          { name: "बल्लभगढ़ (Ballabgarh)", lat: 28.3300, lng: 77.3200 },
          { name: "बड़खल (Badkhal)", lat: 28.4200, lng: 77.2800 }
        ]
      },
      {
        name: "सोनीपत (Sonipat)",
        lat: 28.9931, lng: 77.0151,
        tehsils: [
          { name: "सोनीपत (Sonipat City)", lat: 28.9900, lng: 77.0100 },
          { name: "राई / कुंडली (Rai / Kundli)", lat: 28.9200, lng: 77.1000 },
          { name: "गन्नौर (Ganaur)", lat: 29.1300, lng: 77.0200 },
          { name: "गोहाना (Gohana)", lat: 29.1300, lng: 76.7000 }
        ]
      }
    ]
  },
  {
    name: "उत्तराखंड (Uttarakhand)",
    districts: [
      {
        name: "देहरादून (Dehradun)",
        lat: 30.3165, lng: 78.0322,
        tehsils: [
          { name: "देहरादून सदर (Sadar)", lat: 30.3200, lng: 78.0300 },
          { name: "ऋषिकेश (Rishikesh)", lat: 30.1000, lng: 78.3000 },
          { name: "विकासनगर (Vikasnagar)", lat: 30.4800, lng: 77.7700 },
          { name: "डोईवाला (Doiwala)", lat: 30.1800, lng: 78.1200 }
        ]
      },
      {
        name: "हरिद्वार (Haridwar)",
        lat: 29.9457, lng: 78.1642,
        tehsils: [
          { name: "हरिद्वार (Haridwar City)", lat: 29.9500, lng: 78.1600 },
          { name: "रुड़की (Roorkee)", lat: 29.8700, lng: 77.8800 },
          { name: "लक्सर (Laksar)", lat: 29.7500, lng: 78.0300 },
          { name: "भगवानपुर (Bhagwanpur)", lat: 30.0500, lng: 77.8200 }
        ]
      }
    ]
  },
  {
    name: "झारखंड (Jharkhand)",
    districts: [
      {
        name: "रांची (Ranchi)",
        lat: 23.3441, lng: 85.3096,
        tehsils: [
          { name: "रांची सदर (Sadar)", lat: 23.3400, lng: 85.3100 },
          { name: "कांके (Kanke)", lat: 23.4300, lng: 85.3200 },
          { name: "ओरमांझी (Ormanjhi)", lat: 23.4800, lng: 85.4800 },
          { name: "रातू (Ratu)", lat: 23.4000, lng: 85.1800 },
          { name: "बुंडू (Bundu)", lat: 23.1800, lng: 85.5800 }
        ]
      },
      {
        name: "धनबाद (Dhanbad)",
        lat: 23.7957, lng: 86.4304,
        tehsils: [
          { name: "धनबाद सदर (Sadar)", lat: 23.8000, lng: 86.4300 },
          { name: "बाघमारा (Baghmara)", lat: 23.8000, lng: 86.2000 },
          { name: "झरिया (Jharia)", lat: 23.7500, lng: 86.4200 },
          { name: "निरसा (Nirsa)", lat: 23.7800, lng: 86.7200 }
        ]
      },
      {
        name: "पूर्वी सिंहभूम (Jamshedpur)",
        lat: 22.8046, lng: 86.2029,
        tehsils: [
          { name: "जमशेदपुर / गोलमुरी (Jamshedpur)", lat: 22.8000, lng: 86.2000 },
          { name: "घाटशिला (Ghatshila)", lat: 22.5800, lng: 86.4800 },
          { name: "बहरागोड़ा (Baharagora)", lat: 22.2800, lng: 86.7200 }
        ]
      }
    ]
  }
];

/**
 * Given lat, lng, returns formatted name of closest tehsil / district / state.
 */
export function getFriendlyLocationName(lat, lng) {
  if (lat == null || lng == null) return null;
  let closest = null;
  let minDist = 999999;

  for (const s of STATES_DATA) {
    for (const d of s.districts) {
      for (const t of d.tehsils) {
        const dist = Math.hypot(t.lat - lat, t.lng - lng);
        if (dist < minDist) {
          minDist = dist;
          closest = {
            state: s.name.split(' (')[0],
            district: d.name.split(' (')[0],
            tehsil: t.name.split(' (')[0]
          };
        }
      }
    }
  }

  if (closest && minDist < 0.8) {
    return `${closest.tehsil}, ${closest.district} (${closest.state})`;
  }
  return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
}

