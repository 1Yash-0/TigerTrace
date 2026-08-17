export type Language = "en" | "hi" | "mr";

export interface TranslationDict {
  // Navigation & Branding
  nav_brand_title: string;
  nav_brand_subtitle: string;
  nav_identify_tiger: string;
  nav_upload_video: string;
  nav_tiger_habitat: string;
  nav_patrol_priority: string;
  nav_ai_assistant: string;
  nav_territory: string;
  nav_alerts: string;
  nav_triage: string;

  // Hero Section
  hero_title_1: string;
  hero_title_2: string;
  hero_scroll_explore: string;

  // Wildlife / Habitat Section
  habitat_title_1: string;
  habitat_title_2: string;
  habitat_quote: string;
  habitat_desc: string;
  habitat_cta: string;

  // Corridors / Tigers Section
  corridors_title: string;
  corridors_desc: string;
  corridors_territory_label: string;
  corridors_zone_label: string;
  corridors_status_label: string;
  corridors_explore_map_cta: string;
  corridors_patrol_cta: string;

  // Sanctuary & Statistics Section
  sanctuary_title_1: string;
  sanctuary_title_2: string;
  sanctuary_desc_1: string;
  sanctuary_desc_2: string;
  stat_tigers_tracked: string;
  stat_captures: string;
  stat_blanks_filtered: string;
  stat_storage_saved: string;

  // Map Card on Sanctuary Panel
  map_card_title: string;
  map_card_badge: string;
  map_card_core_label: string;
  map_card_buffer_label: string;
  map_card_river_label: string;
  map_card_stations_label: string;
  map_card_cta: string;

  // Patrol Dashboard
  patrol_title: string;
  patrol_subtitle: string;
  patrol_critical: string;
  patrol_high: string;
  patrol_moderate: string;
  patrol_low: string;
  patrol_summary_heading: string;
  patrol_station_list_heading: string;
  patrol_inspect_factors: string;
  patrol_sequence_heading: string;
  patrol_export_csv: string;

  // Chatbot
  chat_title: string;
  chat_subtitle: string;
  chat_placeholder: string;
  chat_suggest_1: string;
  chat_suggest_2: string;
  chat_suggest_3: string;
  chat_suggest_4: string;

  // Alerts
  alerts_badge: string;
  alerts_title: string;
  alerts_subtitle: string;
  alerts_run_engine: string;
  alerts_export_csv: string;

  // Triage
  triage_badge: string;
  triage_title: string;
  triage_subtitle: string;

  // Common
  select_language: string;
  zone_core: string;
  zone_buffer: string;
  zone_interface: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    nav_brand_title: "TigerTrace",
    nav_brand_subtitle: "PENCH TIGER RESERVE",
    nav_identify_tiger: "IDENTIFY TIGER",
    nav_upload_video: "UPLOAD VIDEO",
    nav_tiger_habitat: "TIGER HABITAT",
    nav_patrol_priority: "PATROL PRIORITY",
    nav_ai_assistant: "AI ASSISTANT",
    nav_territory: "TERRITORY",
    nav_alerts: "ALERTS",
    nav_triage: "TRIAGE",

    hero_title_1: "Every Tiger Counted,",
    hero_title_2: "Is a Tiger Protected.",
    hero_scroll_explore: "SCROLL TO EXPLORE ↓",

    habitat_title_1: "Wildlife",
    habitat_title_2: "at Pench Reserve",
    habitat_quote: "“Always leave space for the tiger” is our founding mantra. That philosophy guides the Pench Tiger Reserve intelligence platform.",
    habitat_desc: "We are a dedicated haven for the Royal Bengal Tiger (Panthera tigris). Powered by computer vision and deep stripe flank biometric embeddings, we track, identify, and monitor individual tigers non-invasively across dense teak and bamboo canopies.",
    habitat_cta: "START IDENTIFYING TIGERS →",

    corridors_title: "Royal Bengal Corridors",
    corridors_desc: "While Pench harbors rich biodiversity, our AI pipeline focuses on individual Bengal tiger flank stripe patterns, minimum convex polygon home ranges, and community interface alerts.",
    corridors_territory_label: "TERRITORY:",
    corridors_zone_label: "ZONE:",
    corridors_status_label: "STATUS:",
    corridors_explore_map_cta: "EXPLORE ON MAP →",
    corridors_patrol_cta: "PATROL PRIORITIES →",

    sanctuary_title_1: "Pench Tiger Reserve, a premier territory recognized for",
    sanctuary_title_2: "biodiversity.",
    sanctuary_desc_1: "Spanning 758 sq km of rich teak and mixed deciduous forest along the Pench River in Central India. From core river valleys to buffer fringe corridors, Pench harbors thriving tiger populations and rich wildlife corridors.",
    sanctuary_desc_2: "Supports 20 camera trap stations, automated blank triage, stripe biometric re-identification, and intelligent patrol priority recommendation scoring.",
    stat_tigers_tracked: "Resident Tigers Tracked",
    stat_captures: "Camera Trap Captures",
    stat_blanks_filtered: "Empty Blanks Filtered",
    stat_storage_saved: "Storage Saved (Offline)",

    map_card_title: "PENCH NATIONAL PARK MAP",
    map_card_badge: "758 SQ KM PROTECTED",
    map_card_core_label: "Core Protected Forest",
    map_card_buffer_label: "Buffer Eco-Corridor",
    map_card_river_label: "Pench River Basin",
    map_card_stations_label: "20 Active Stations",
    map_card_cta: "OPEN INTERACTIVE TERRITORY MAP →",

    patrol_title: "Patrol Priority Intelligence Board",
    patrol_subtitle: "Offline Station-Level Monitoring Priority & Management Recommendation Engine",
    patrol_critical: "CRITICAL PRIORITY",
    patrol_high: "HIGH PRIORITY",
    patrol_moderate: "MODERATE PRIORITY",
    patrol_low: "LOW PRIORITY",
    patrol_summary_heading: "Reserve Patrol Summary",
    patrol_station_list_heading: "Station Priority Ranking",
    patrol_inspect_factors: "Score Factor Contributions",
    patrol_sequence_heading: "Suggested Tactical Patrol Sequence",
    patrol_export_csv: "EXPORT PATROL CSV",

    chat_title: "Pench Conservation Intelligence Assistant",
    chat_subtitle: "Offline database-grounded natural language query engine for camera trap telemetry",
    chat_placeholder: "Ask about tigers, camera stations, alerts, patrol priorities...",
    chat_suggest_1: "Which stations should we prioritize today?",
    chat_suggest_2: "Where was Choti Tara (PTR-T01) last seen?",
    chat_suggest_3: "Show suggested patrol sequence",
    chat_suggest_4: "Are there any village boundary alerts?",

    alerts_badge: "Real-time Territory Surveillance",
    alerts_title: "Behavioral Alerts",
    alerts_subtitle: "Automated anomaly detection monitoring boundary drift, nomadic expansions, and individual absence durations across Pench Tiger Reserve.",
    alerts_run_engine: "Run Alert Engine",
    alerts_export_csv: "Export CSV",

    triage_badge: "MegaDetector V6 Computer Vision",
    triage_title: "Camera Trap Triage",
    triage_subtitle: "Automated blank image filtering quarantining empty frames triggered by wind or grasses, retaining valid predator captures.",

    select_language: "Language",
    zone_core: "Core Zone",
    zone_buffer: "Buffer Zone",
    zone_interface: "Village Interface",
  },

  hi: {
    nav_brand_title: "टाइगरट्रेस",
    nav_brand_subtitle: "पेंच टाइगर रिजर्व",
    nav_identify_tiger: "बाघ पहचानें",
    nav_upload_video: "वीडियो अपलोड",
    nav_tiger_habitat: "बाघ पर्यावास",
    nav_patrol_priority: "गश्त प्राथमिकता",
    nav_ai_assistant: "एआई सहायक",
    nav_territory: "क्षेत्रीय मानचित्र",
    nav_alerts: "सतर्कता अलर्ट",
    nav_triage: "कैमरा ट्राइएज",

    hero_title_1: "हर बाघ की गिनती,",
    hero_title_2: "हर बाघ की सुरक्षा।",
    hero_scroll_explore: "खोजने के लिए स्क्रॉल करें ↓",

    habitat_title_1: "वन्यजीव संपदा",
    habitat_title_2: "पेंच टाइगर रिजर्व में",
    habitat_quote: "“बाघ के लिए सदैव स्थान छोड़ें” — यही हमारा मूल मंत्र है। यही दर्शन पेंच टाइगर रिजर्व के एआई निगरानी मंच का मार्गदर्शन करता है।",
    habitat_desc: "हम रॉयल बंगाल टाइगर (पैंथेरा टाइग्रिस) के संरक्षण के लिए समर्पित हैं। कंप्यूटर विज़न और गहरी धारियों (स्ट्राइप बायोमेट्रिक्स) के माध्यम से हम घने सागौन और बांस के वनों में बिना किसी कॉलर के व्यक्तिगत बाघों की पहचान और निगरानी करते हैं।",
    habitat_cta: "बाघों की पहचान शुरू करें →",

    corridors_title: "रॉयल बंगाल टाइगर गलियारे",
    corridors_desc: "पेंच में तेंदुओं से लेकर जंगली कुत्तों तक समृद्ध जैव विविधता है, लेकिन हमारी एआई प्रणाली विशेष रूप से व्यक्तिगत बाघों की धारियों के पैटर्न, होम रेंज और गांव सीमा सुरक्षा पर केंद्रित है।",
    corridors_territory_label: "क्षेत्र (टेरिटरी):",
    corridors_zone_label: "ज़ोन:",
    corridors_status_label: "स्थिति:",
    corridors_explore_map_cta: "नक्शे पर देखें →",
    corridors_patrol_cta: "गश्त प्राथमिकताएं →",

    sanctuary_title_1: "पेंच टाइगर रिजर्व, अद्वितीय",
    sanctuary_title_2: "जैव विविधता के लिए प्रसिद्ध।",
    sanctuary_desc_1: "मध्य भारत में पेंच नदी के किनारे 758 वर्ग किमी में फैला सागौन और मिश्रित पर्णपाती वन। मुख्य नदी घाटियों से लेकर बफर गलियारों तक, पेंच समृद्ध बाघ आबादी का प्राकृतिक आश्रय है।",
    sanctuary_desc_2: "20 कैमरा ट्रैप स्टेशनों, स्वचालित खाली फोटो छंटाई, बायोमेट्रिक पहचान और बुद्धिमान गश्त सिफारिश प्रणाली द्वारा संचालित।",
    stat_tigers_tracked: "निगरानी में कुल बाघ",
    stat_captures: "कैमरा ट्रैप कैप्चर",
    stat_blanks_filtered: "खाली फोटो फिल्टर किए",
    stat_storage_saved: "बचाया गया स्टोरेज (ऑफलाइन)",

    map_card_title: "पेंच राष्ट्रीय उद्यान मानचित्र",
    map_card_badge: "758 वर्ग किमी संरक्षित",
    map_card_core_label: "कोर संरक्षित वन क्षेत्र",
    map_card_buffer_label: "बफर पर्यावरण गलियारा",
    map_card_river_label: "पेंच नदी बेसिन",
    map_card_stations_label: "20 सक्रिय कैमरा स्टेशन",
    map_card_cta: "इंटरैक्टिव नक्शा खोलें →",

    patrol_title: "गश्त प्राथमिकता एवं प्रबंधन बोर्ड",
    patrol_subtitle: "कैमरा स्टेशन स्तर पर निगरानी प्राथमिकता और सामरिक गश्त सिफारिश इंजन (पूर्णतः ऑफलाइन)",
    patrol_critical: "अति महत्वपूर्ण (क्रिटिकल)",
    patrol_high: "उच्च प्राथमिकता (हाई)",
    patrol_moderate: "मध्यम प्राथमिकता",
    patrol_low: "सामान्य प्राथमिकता",
    patrol_summary_heading: "रिजर्व गश्त सारांश",
    patrol_station_list_heading: "स्टेशन प्राथमिकता रैंकिंग",
    patrol_inspect_factors: "स्कोर घटक विश्लेषण",
    patrol_sequence_heading: "सुझाई गई सामरिक गश्त योजना",
    patrol_export_csv: "गश्त डेटा CSV डाउनलोड",

    chat_title: "पेंच वन्यजीव संरक्षण एआई सहायक",
    chat_subtitle: "कैमरा ट्रैप टेलीमेट्री और बाघ निगरानी के लिए सुरक्षित ऑफलाइन प्राकृतिक भाषा सहायक",
    chat_placeholder: "बाघों, कैमरा स्टेशनों, अलर्ट या गश्त प्राथमिकताओं के बारे में पूछें...",
    chat_suggest_1: "आज किन स्टेशनों पर प्राथमिकता से गश्त करनी चाहिए?",
    chat_suggest_2: "छोटी तारा (PTR-T01) को अंतिम बार कहाँ देखा गया?",
    chat_suggest_3: "सुझाई गई गश्त क्रम सूची दिखाएं",
    chat_suggest_4: "क्या कोई गांव सीमा अलर्ट सक्रिय है?",

    alerts_badge: "रियल-टाइम क्षेत्र निगरानी",
    alerts_title: "व्यवहार सतर्कता",
    alerts_subtitle: "सीमा बदलाव, खानाबदोश विस्तार और व्यक्तिगत बाघों की अनुपस्थिति अवधियों की स्वचालित विसंगति पहचान।",
    alerts_run_engine: "अलर्ट इंजन चलाएं",
    alerts_export_csv: "CSV डाउनलोड",

    triage_badge: "मेगाडिटेक्टर V6 कंप्यूटर दृष्टि",
    triage_title: "कैमरा ट्रैप ट्रायेज",
    triage_subtitle: "वायु या घास से ट्रिगर हुई खाली फ्रेम हटाने की स्वचालित प्रणाली, वैध शिकारी चित्र सुरक्षित रखती है।",

    select_language: "भाषा",
    zone_core: "कोर ज़ोन",
    zone_buffer: "बफर ज़ोन",
    zone_interface: "गांव सीमा क्षेत्र",
  },

  mr: {
    nav_brand_title: "टायगरट्रेस",
    nav_brand_subtitle: "पेंच व्याघ्र प्रकल्प",
    nav_identify_tiger: "वाघ ओळखा",
    nav_upload_video: "व्हिडिओ अपलोड",
    nav_tiger_habitat: "वाघांचे अधिवास",
    nav_patrol_priority: "गस्त प्राथमिकता",
    nav_ai_assistant: "एआय सहाय्यक",
    nav_territory: "प्रादेशिक नकाशा",
    nav_alerts: "सुरक्षा अलर्ट",
    nav_triage: "कॅमेरा ट्रायज",

    hero_title_1: "प्रत्येक वाघाची नोंद,",
    hero_title_2: "हीच वाघांची सुरक्षा.",
    hero_scroll_explore: "पाहण्यासाठी खाली स्क्रोल करा ↓",

    habitat_title_1: "वन्यजीव संपदा",
    habitat_title_2: "पेंच व्याघ्र प्रकल्पात",
    habitat_quote: "“वाघासाठी नेहमी जागा सोडा” — हाच आमचा मूळ विचार आहे. हाच दृष्टिकोन पेंच व्याघ्र प्रकल्पाच्या एआय देखरेख प्रणालीला दिशा देतो.",
    habitat_desc: "आम्ही रॉयल बंगाल वाघ (पँथेरा टायग्रीस) संवर्धनासाठी कटिबद्ध आहोत. संगणक दृष्टी (Computer Vision) आणि पट्ट्यांच्या बायोमेट्रिक्सच्या साहाय्याने आम्ही कोणत्याही कॉलरशिवाय वैयक्तिक वाघांची अचूक नोंद ठेवतो.",
    habitat_cta: "वाघ ओळखण्यास सुरुवात करा →",

    corridors_title: "रॉयल बंगाल वाघ भ्रमणमार्ग",
    corridors_desc: "पेंचमध्ये बिबट्यांपासून ते रानकुत्र्यांपर्यंत समृद्ध जैवविविधता आहे, परंतु आमची एआय प्रणाली विशेषतः वाघांच्या पट्ट्यांचे नमुने, संचार क्षेत्र आणि गाव सीमा सुरक्षेवर लक्ष केंद्रित करते.",
    corridors_territory_label: "क्षेत्र (टेरिटरी):",
    corridors_zone_label: "झोन:",
    corridors_status_label: "स्थिती:",
    corridors_explore_map_cta: "नकाशावर पहा →",
    corridors_patrol_cta: "गस्त प्राधान्यक्रम →",

    sanctuary_title_1: "पेंच व्याघ्र प्रकल्प, समृद्ध",
    sanctuary_title_2: "जैवविविधतेसाठी जगप्रसिद्ध.",
    sanctuary_desc_1: "मध्य भारतात पेंच नदीच्या काठावर ७५८ चौ.किमी. पसरलेले सागवान व मिश्र पानगळ जंगल. मुख्य नदीच्या खोऱ्यांपासून ते बफर कॉरिडोअरपर्यंत, पेंच हे वाघांचे सुरक्षित माहेरघर आहे.",
    sanctuary_desc_2: "२० कॅमेरा ट्रॅप स्टेशन्स, स्वयंचलित रिकाम्या फोटोंची वर्गवारी, बायोमेट्रिक ओळख आणि गस्त शिफारस प्रणालीने सुसज्ज.",
    stat_tigers_tracked: "नोंद असलेले निवासी वाघ",
    stat_captures: "कॅमेरा ट्रॅप कॅप्चर्स",
    stat_blanks_filtered: "रिकामे फोटो फिल्टर केले",
    stat_storage_saved: "वाचवलेला डेटा (ऑफलाइन)",

    map_card_title: "पेंच राष्ट्रीय उद्यान नकाशा",
    map_card_badge: "७५८ चौ.किमी. संरक्षित क्षेत्र",
    map_card_core_label: "गाभा (Core) संरक्षित जंगल",
    map_card_buffer_label: "बफर पर्यावरण कॉरिडोअर",
    map_card_river_label: "पेंच नदी खोरे",
    map_card_stations_label: "२० सक्रिय कॅमेरा स्टेशन्स",
    map_card_cta: "संपूर्ण नकाशा उघडा →",

    patrol_title: "गस्त प्राथमिकता आणि व्यवस्थापन फलक",
    patrol_subtitle: "कॅमेरा स्टेशन निहाय देखरेख प्राधान्यक्रम आणि कृती योजना (ऑफलाइन प्रणाली)",
    patrol_critical: "अतिसंवेदनशील (क्रिटिकल)",
    patrol_high: "उच्च प्राथमिकता (हाय)",
    patrol_moderate: "मध्यम प्राथमिकता",
    patrol_low: "सामान्य प्राथमिकता",
    patrol_summary_heading: "प्रकल्प गस्त सारांश",
    patrol_station_list_heading: "स्टेशन प्राधान्य क्रमवारी",
    patrol_inspect_factors: "गुण घटक विश्लेषण",
    patrol_sequence_heading: "सुचवलेली सामरिक गस्त योजना",
    patrol_export_csv: "गस्त डेटा CSV डाउनलोड",

    chat_title: "पेंच वन्यजीव संवर्धन एआय सहाय्यक",
    chat_subtitle: "कॅमेरा ट्रॅप माहिती व वाघांच्या हालचालींसाठी सुरक्षित ऑफलाइन नैसर्गिक भाषा सहाय्यक",
    chat_placeholder: "वाघ, कॅमेरा स्टेशन्स, अलर्ट किंवा गस्त प्राधान्यांबद्दल विचारा...",
    chat_suggest_1: "आज कोणत्या स्टेशन्सवर प्राधान्याने गस्त घालावी?",
    chat_suggest_2: "छोटी तारा (PTR-T01) शेवटी कुठे दिसली होती?",
    chat_suggest_3: "सुचवलेला गस्त क्रम दाखवा",
    chat_suggest_4: "काही गाव सीमा अलर्ट आहेत का?",

    alerts_badge: "रिअल-टाइम प्रादेशिक देखरेख",
    alerts_title: "वर्तणूक अलर्ट",
    alerts_subtitle: "सीमा बदल, भटकंती आणि वाघांच्या अनुपस्थितीचे स्वयंचलित शोध.",
    alerts_run_engine: "अलर्ट इंजिन चालवा",
    alerts_export_csv: "CSV डाउनलोड",

    triage_badge: "मेगाडिटेक्टर V6 संगणक दृष्टी",
    triage_title: "कॅमेरा ट्रॅप ट्रायज",
    triage_subtitle: "वारा वा गवताने ट्रिगर झालेले रिकामे फ्रेम काढून टाकणे, योग्य शिकारी चित्रे जपले जातात.",

    select_language: "भाषा",
    zone_core: "गाभा (Core) झोन",
    zone_buffer: "बफर झोन",
    zone_interface: "गाव सीमा भाग",
  },
};
