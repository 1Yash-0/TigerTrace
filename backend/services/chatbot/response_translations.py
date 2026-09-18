"""
Trilingual label pack for chatbot responses (English / Hindi / Marathi).
Data values (tiger names, IDs, numbers) stay as-is; only the surrounding
template strings are localized. The frontend passes `language` with each
request; intent routing stays English-keyword-based regardless.
"""

L = {
    # ── shared fragments ────────────────────────────────────────────────
    "registered_in_db": {
        "en": "are currently registered in the Pench Tiger Reserve database:",
        "hi": "पेंच टाइगर रिजर्व डेटाबेस में वर्तमान में पंजीकृत हैं:",
        "mr": "पेंच टायगर रिझर्व्ह डेटाबेसमध्ये सध्या नोंदणीकृत आहेत:",
    },
    "no_tigers_registered": {
        "en": "No tigers are currently registered in the database.",
        "hi": "डेटाबेस में अभी कोई बाघ पंजीकृत नहीं है।",
        "mr": "डेटाबेसमध्ये सध्या कोणताही वाघ नोंदणीकृत नाही.",
    },
    "last_seen_at": {
        "en": "last seen at",
        "hi": "अंतिम बार देखा गया",
        "mr": "शेवटचे दिसले",
    },
    "no_captures": {
        "en": "no captures recorded",
        "hi": "कोई कैप्चर दर्ज नहीं",
        "mr": "कोणतेही कॅप्चर नोंद नाहीत",
    },
    "captures": {
        "en": "captures",
        "hi": "कैप्चर",
        "mr": "कॅप्चर",
    },
    "sex": {
        "en": "Sex",
        "hi": "लिंग",
        "mr": "लिंग",
    },
    "male": {
        "en": "Male",
        "hi": "नर",
        "mr": "नर",
    },
    "female": {
        "en": "Female",
        "hi": "मादा",
        "mr": "मादा",
    },
    "total_captures": {
        "en": "Total Captures",
        "hi": "कुल कैप्चर",
        "mr": "एकूण कॅप्चर",
    },
    "stations_visited": {
        "en": "Stations Visited",
        "hi": "देखे गए स्टेशन",
        "mr": "पाहिलेली स्थानके",
    },
    "stations": {
        "en": "stations",
        "hi": "स्टेशन",
        "mr": "स्थानके",
    },
    "zone_breakdown": {
        "en": "Zone Breakdown",
        "hi": "क्षेत्र विवरण",
        "mr": "विभाग तपशील",
    },
    "first_seen": {
        "en": "First Seen",
        "hi": "पहली बार देखा गया",
        "mr": "पहिल्यांदा दिसले",
    },
    "last_seen_hdr": {
        "en": "Last Seen",
        "hi": "अंतिम बार देखा गया",
        "mr": "शेवटचे दिसले",
    },
    "open_alerts": {
        "en": "Open Alerts",
        "hi": "खुले अलर्ट",
        "mr": "उघडे सूचना",
    },
    "tiger_profile": {
        "en": "Tiger Profile",
        "hi": "बाघ प्रोफ़ाइल",
        "mr": "वाघ प्रोफाइल",
    },
    "detections_for": {
        "en": "detections for",
        "hi": "के लिए डिटेक्शन",
        "mr": "साठी शोध",
    },
    "no_detections": {
        "en": "No detections found for",
        "hi": "के लिए कोई डिटेक्शन नहीं मिला",
        "mr": "साठी कोणतेही शोध सापडले नाहीत",
    },
    "during": {
        "en": "during",
        "hi": "के दौरान",
        "mr": "दरम्यान",
    },
    "all_time": {
        "en": "all time",
        "hi": "सभी समय",
        "mr": "सर्व काळ",
    },
    "confidence": {
        "en": "confidence",
        "hi": "विश्वसनीयता",
        "mr": "खात्री",
    },
    "at_station": {
        "en": "at",
        "hi": "पर",
        "mr": "येथे",
    },
    "movement_summary": {
        "en": "Movement summary for",
        "hi": "के लिए आंदोलन सारांश",
        "mr": "साठी हालचाल सारांश",
    },
    "movement_timeline": {
        "en": "Movement timeline for",
        "hi": "के लिए आंदोलन टाइमलाइन",
        "mr": "साठी हालचाल वेळापत्रक",
    },
    "records": {
        "en": "records",
        "hi": "रिकॉर्ड",
        "mr": "नोंदी",
    },
    "unique_stations": {
        "en": "unique stations",
        "hi": "अद्वितीय स्टेशन",
        "mr": "वेगळी स्थानके",
    },
    "route": {
        "en": "Route",
        "hi": "मार्ग",
        "mr": "मार्ग",
    },
    "moved_km": {
        "en": "moved",
        "hi": "चला गया",
        "mr": "हलले",
    },
    "km": {
        "en": "km",
        "hi": "किमी",
        "mr": "किमी",
    },
    "home_range": {
        "en": "Home Range",
        "hi": "होम रेंज",
        "mr": "अधिवास क्षेत्र",
    },
    "home_ranges_for": {
        "en": "Home ranges for",
        "hi": "के लिए होम रेंज",
        "mr": "साठी अधिवास क्षेत्रे",
    },
    "area": {
        "en": "Area",
        "hi": "क्षेत्रफल",
        "mr": "क्षेत्रफळ",
    },
    "sq_km": {
        "en": "sq km",
        "hi": "वर्ग किमी",
        "mr": "चौ.किमी",
    },
    "centroid": {
        "en": "Centroid",
        "hi": "केंद्र",
        "mr": "केंद्रबिंदू",
    },
    "largest_territory": {
        "en": "Largest territory",
        "hi": "सबसे बड़ा क्षेत्र",
        "mr": "सर्वात मोठे क्षेत्र",
    },
    "overlaps_detected": {
        "en": "territory overlaps detected:",
        "hi": "क्षेत्र ओवरलैप पाए गए:",
        "mr": "क्षेत्र ओव्हरलॅप सापडले:",
    },
    "overlap": {
        "en": "overlap",
        "hi": "ओवरलैप",
        "mr": "ओव्हरलॅप",
    },
    "no_overlaps": {
        "en": "No territory overlaps detected between any tiger pairs.",
        "hi": "किसी भी बाघ-जोड़े के बीच कोई क्षेत्र ओवरलैप नहीं मिला।",
        "mr": "कोणत्याही वाघ-जोडीदरम्यान क्षेत्र ओव्हरलॅप सापडले नाही.",
    },
    "alerts_for": {
        "en": "alerts for",
        "hi": "के लिए अलर्ट",
        "mr": "साठी सूचना",
    },
    "open": {
        "en": "open",
        "hi": "खुले",
        "mr": "उघडे",
    },
    "OPEN": {
        "en": "OPEN",
        "hi": "खुला",
        "mr": "उघडा",
    },
    "RESOLVED": {
        "en": "RESOLVED",
        "hi": "हल",
        "mr": "सोडवले",
    },
    "no_alerts_on_record": {
        "en": "No alerts on record for",
        "hi": "के लिए कोई अलर्ट दर्ज नहीं",
        "mr": "साठी कोणतीही सूचना नोंद नाही",
    },
    "no_buffer_tigers": {
        "en": "No tigers have been detected in buffer or village-adjacent zones.",
        "hi": "बफर या ग्राम-सन्निकट क्षेत्रों में कोई बाघ नहीं पाया गया।",
        "mr": "बफर किंवा गाव-लगत विभागांमध्ये कोणताही वाघ सापडला नाही.",
    },
    "tigers_in_buffer": {
        "en": "tigers detected in buffer/village zones:",
        "hi": "बाघ बफर/ग्राम क्षेत्रों में पाए गए:",
        "mr": "बफर/गाव विभागांमध्ये वाघ सापडले:",
    },
    "in_buffer_zone": {
        "en": "captures in buffer zone",
        "hi": "बफर क्षेत्र में कैप्चर",
        "mr": "बफर विभागात कॅप्चर",
    },
    "all_seen_recently": {
        "en": "All tigers have been seen within the last 30 days.",
        "hi": "सभी बाघ पिछले 30 दिनों में देखे गए हैं।",
        "mr": "सर्व वाघ गेल्या ३० दिवसांत दिसले आहेत.",
    },
    "prolonged_absence": {
        "en": "tigers with prolonged absence (≥30 days):",
        "hi": "लंबी अनुपस्थिति (≥30 दिन) वाले बाघ:",
        "mr": "दीर्घ अनुपस्थिती (≥३० दिवस) असलेले वाघ:",
    },
    "days_absent": {
        "en": "days absent, last at",
        "hi": "दिन अनुपस्थित, अंतिम बार",
        "mr": "दिवस अनुपस्थिती, शेवटचे",
    },
    "on_date": {
        "en": "on",
        "hi": "को",
        "mr": "रोजी",
    },
    "total_captures_lbl": {
        "en": "Total Captures",
        "hi": "कुल कैप्चर",
        "mr": "एकूण कॅप्चर",
    },
    "tigers_detected": {
        "en": "Tigers Detected",
        "hi": "पाए गए बाघ",
        "mr": "सापडलेले वाघ",
    },
    "zone": {
        "en": "Zone",
        "hi": "क्षेत्र",
        "mr": "विभाग",
    },
    "latest_activity": {
        "en": "Latest Activity",
        "hi": "नवीनतम गतिविधि",
        "mr": "ताजी हालचाल",
    },
    "camera_stations_ranked": {
        "en": "camera stations ranked by activity:",
        "hi": "कैमरा स्टेशन गतिविधि के अनुसार क्रमबद्ध:",
        "mr": "कॅमेरा स्थानके हालचालीनुसार क्रमवार:",
    },
    "village_adjacent": {
        "en": "village-adjacent",
        "hi": "ग्राम-सन्निकट",
        "mr": "गाव-लगत",
    },
    "no_alerts_found": {
        "en": "No alerts found.",
        "hi": "कोई अलर्ट नहीं मिला।",
        "mr": "कोणतीही सूचना सापडली नाही.",
    },
    "filtered_by_severity": {
        "en": "filtered by",
        "hi": "फ़िल्टर",
        "mr": "फिल्टर",
    },
    "severity": {
        "en": "severity",
        "hi": "गंभीरता",
        "mr": "तीव्रता",
    },
    "high": {
        "en": "high",
        "hi": "उच्च",
        "mr": "उच्च",
    },
    "medium": {
        "en": "medium",
        "hi": "मध्यम",
        "mr": "मध्यम",
    },
    "low": {
        "en": "low",
        "hi": "निम्न",
        "mr": "कमी",
    },
    "no_deviations": {
        "en": "No abnormal movement deviations currently detected.",
        "hi": "अभी कोई असामान्य आंदोलन विचलन नहीं मिला।",
        "mr": "सध्या कोणतेही असामान्य हालचाल विचलन सापडले नाहीत.",
    },
    "movement_deviations": {
        "en": "movement deviations detected:",
        "hi": "आंदोलन विचलन पाए गए:",
        "mr": "हालचाल विचलने सापडली:",
    },
    "no_high_risk": {
        "en": "No high-risk stations identified.",
        "hi": "कोई उच्च-जोखिम स्टेशन नहीं मिला।",
        "mr": "कोणतेही उच्च-धोकाची स्थानके नाहीत.",
    },
    "stations_elevated_risk": {
        "en": "stations with elevated risk:",
        "hi": "उच्च जोखिम वाले स्टेशन:",
        "mr": "वाढलेल्या धोक्याची स्थानके:",
    },
    "no_village_detections": {
        "en": "No tiger detections at village-adjacent stations.",
        "hi": "ग्राम-सन्निकट स्टेशनों पर कोई बाघ नहीं पाया गया।",
        "mr": "गाव-लगत स्थानकांवर कोणताही वाघ सापडला नाही.",
    },
    "village_stations_activity": {
        "en": "village-adjacent stations with tiger activity:",
        "hi": "ग्राम-सन्निकट स्टेशन जहाँ बाघ देखे गए:",
        "mr": "गाव-लगत स्थानके जिथे वाघ दिसले:",
    },
    "latest_run": {
        "en": "Latest Run",
        "hi": "नवीनतम रन",
        "mr": "ताजी धाव",
    },
    "total_images": {
        "en": "Total Images",
        "hi": "कुल चित्र",
        "mr": "एकूण चित्रे",
    },
    "blanks_removed": {
        "en": "Blanks Removed",
        "hi": "खाली चित्र हटाए",
        "mr": "रिकामी चित्रे काढली",
    },
    "retained": {
        "en": "Retained",
        "hi": "रखे गए",
        "mr": "ठेवली",
    },
    "storage_saved": {
        "en": "Storage Saved",
        "hi": "स्टोरेज बचाया",
        "mr": "स्टोरेज वाचले",
    },
    "time_saved": {
        "en": "Time Saved",
        "hi": "समय बचाया",
        "mr": "वेळ वाचला",
    },
    "minutes": {
        "en": "min",
        "hi": "मिनट",
        "mr": "मिनिटे",
    },
    "cumulative": {
        "en": "Cumulative",
        "hi": "संचित",
        "mr": "संचयी",
    },
    "runs": {
        "en": "runs",
        "hi": "रन",
        "mr": "धावा",
    },
    "total_processed": {
        "en": "Total Processed",
        "hi": "कुल संसाधित",
        "mr": "एकूण प्रक्रिया",
    },
    "images": {
        "en": "images",
        "hi": "चित्र",
        "mr": "चित्रे",
    },
    "image_processing_stats": {
        "en": "Image Processing Statistics",
        "hi": "चित्र प्रसंस्करण सांख्यिकी",
        "mr": "चित्र प्रक्रिया सांख्यिकी",
    },
    "blank_filtering_results": {
        "en": "Blank Image Filtering Results",
        "hi": "खाली चित्र फ़िल्टरिंग परिणाम",
        "mr": "रिकामी चित्रे चाळणी निकाल",
    },
    "out_of": {
        "en": "out of",
        "hi": "में से",
        "mr": "पैकी",
    },
    "images_retained": {
        "en": "Images Retained",
        "hi": "रखे गए चित्र",
        "mr": "ठेवलेली चित्रे",
    },
    "last_run": {
        "en": "Last Run",
        "hi": "अंतिम रन",
        "mr": "शेवटची धाव",
    },
    "cycle_summary": {
        "en": "Monitoring Cycle Summary — Pench Tiger Reserve",
        "hi": "निगरानी चक्र सारांश — पेंच टाइगर रिजर्व",
        "mr": "निगरानी चक्र सारांश — पेंच टायगर रिझर्व्ह",
    },
    "tigers": {
        "en": "Tigers",
        "hi": "बाघ",
        "mr": "वाघ",
    },
    "identified_individuals": {
        "en": "identified individuals",
        "hi": "पहचाने गए व्यक्ति",
        "mr": "ओळखलेले व्यक्ती",
    },
    "total_detections": {
        "en": "total detections",
        "hi": "कुल डिटेक्शन",
        "mr": "एकूण शोध",
    },
    "pending_review": {
        "en": "Pending Review",
        "hi": "समीक्षा लंबित",
        "mr": "प्रलंबित पुनरावलोकन",
    },
    "most_active": {
        "en": "Most Active",
        "hi": "सबसे सक्रिय",
        "mr": "सर्वात सक्रिय",
    },
    "alert_breakdown": {
        "en": "Alert Breakdown",
        "hi": "अलर्ट विवरण",
        "mr": "सूचना तपशील",
    },
    "latest_triage": {
        "en": "Latest Triage",
        "hi": "नवीनतम ट्रायेज",
        "mr": "ताजी चाळणी",
    },
    "blanks_removed_saved": {
        "en": "blanks removed",
        "hi": "खाली हटाए",
        "mr": "रिकामी काढली",
    },
    "saved": {
        "en": "saved",
        "hi": "बचाया",
        "mr": "वाचले",
    },
    "review_queue_status": {
        "en": "Review Queue Status",
        "hi": "समीक्षा कतार स्थिति",
        "mr": "पुनरावलोकन रांग स्थिती",
    },
    "awaiting_review": {
        "en": "images awaiting review",
        "hi": "समीक्षा की प्रतीक्षा में चित्र",
        "mr": "पुनरावलोकनाची वाट पाहणारी चित्रे",
    },
    "confirmed_matches": {
        "en": "matches confirmed",
        "hi": "मिलानों की पुष्टि हुई",
        "mr": "जुळण्या खात्री केल्या",
    },
    "new_individuals_registered": {
        "en": "registered",
        "hi": "पंजीकृत",
        "mr": "नोंदणीकृत",
    },
    "pending_items": {
        "en": "Pending Items",
        "hi": "लंबित आइटम",
        "mr": "प्रलंबित घटक",
    },
    "top_match": {
        "en": "Top match",
        "hi": "शीर्ष मिलान",
        "mr": "सर्वोत्तम जुळणी",
    },
    "alt": {
        "en": "Alt",
        "hi": "वैकल्पिक",
        "mr": "पर्यायी",
    },
    "tigers_in_db": {
        "en": "tigers in database (most recently enrolled first):",
        "hi": "डेटाबेस में बाघ (नवीनतम पंजीकृत पहले):",
        "mr": "डेटाबेसमध्ये वाघ (नवीन नोंदणी आधी):",
    },
    "no_tigers_yet": {
        "en": "No tigers in the database yet.",
        "hi": "डेटाबेस में अभी कोई बाघ नहीं है।",
        "mr": "डेटाबेसमध्ये अजून कोणताही वाघ नाही.",
    },
    "enrolled": {
        "en": "enrolled",
        "hi": "पंजीकृत",
        "mr": "नोंदणी",
    },
    "camera_health_report": {
        "en": "Camera Health Report",
        "hi": "कैमरा स्वास्थ्य रिपोर्ट",
        "mr": "कॅमेरा आरोग्य अहवाल",
    },
    "issues": {
        "en": "issues",
        "hi": "समस्याएँ",
        "mr": "समस्या",
    },
    "healthy": {
        "en": "healthy",
        "mr": "निरोगी",
        "hi": "स्वस्थ",
    },
    "all_stations_healthy": {
        "en": "camera stations appear healthy.",
        "hi": "कैमरा स्टेशन स्वस्थ प्रतीत होते हैं।",
        "mr": "कॅमेरा स्थानके निरोगी दिसतात.",
    },
    "inactive_for": {
        "en": "inactive for",
        "hi": "निष्क्रिय",
        "mr": "निष्क्रिय",
    },
    "days": {
        "en": "days",
        "hi": "दिन",
        "mr": "दिवस",
    },
    "system_status": {
        "en": "System Status: OPERATIONAL",
        "hi": "सिस्टम स्थिति: संचालित",
        "mr": "प्रणाली स्थिती: कार्यरत",
    },
    "mode": {
        "en": "Mode",
        "hi": "मोड",
        "mr": "मोड",
    },
    "database": {
        "en": "Database",
        "hi": "डेटाबेस",
        "mr": "डेटाबेस",
    },
    "last_triage": {
        "en": "Last Triage",
        "hi": "अंतिम ट्रायेज",
        "mr": "शेवटची चाळणी",
    },
    "never": {
        "en": "never",
        "hi": "कभी नहीं",
        "mr": "कधीच नाही",
    },
    "patrol_board": {
        "en": "Today's Station Patrol Priority Board — Pench Tiger Reserve",
        "hi": "आज का स्टेशन गश्ती प्राथमिकता बोर्ड — पेंच टाइगर रिजर्व",
        "mr": "आजचे स्थानक गस्त प्राधान्य मंडळ — पेंच टायगर रिझर्व्ह",
    },
    "critical": {
        "en": "Critical",
        "hi": "गंभीर",
        "mr": "गंभीर",
    },
    "top_recommended": {
        "en": "Top Recommended Patrol Stations",
        "hi": "शीर्ष अनुशंसित गश्ती स्टेशन",
        "mr": "सर्वोच्च शिफारस केलेली गस्त स्थानके",
    },
    "drivers": {
        "en": "Drivers",
        "hi": "कारक",
        "mr": "घटक",
    },
    "routine": {
        "en": "Routine",
        "hi": "सामान्य",
        "mr": "नियमित",
    },
    "patrol_priority": {
        "en": "Patrol Priority",
        "hi": "गश्ती प्राथमिकता",
        "mr": "गस्त प्राधान्य",
    },
    "evidence_confidence": {
        "en": "Evidence Confidence",
        "hi": "साक्ष्य विश्वसनीयता",
        "mr": "पुरावा खात्री",
    },
    "reserve_zone": {
        "en": "Reserve Zone",
        "hi": "रिजर्व क्षेत्र",
        "mr": "रिझर्व्ह विभाग",
    },
    "tiger_activity": {
        "en": "Tiger Activity",
        "hi": "बाघ गतिविधि",
        "mr": "वाघ हालचाल",
    },
    "factor_breakdown": {
        "en": "Factor Breakdown & Score Contributions",
        "hi": "कारक विवरण और स्कोर योगदान",
        "mr": "घटक तपशील व स्कोअर योगदान",
    },
    "movement_activity": {
        "en": "Movement Activity",
        "hi": "आंदोलन गतिविधि",
        "mr": "हालचाल",
    },
    "conflict_proximity": {
        "en": "Conflict Proximity",
        "hi": "संघर्ष निकटता",
        "mr": "संघर्ष जवळपण",
    },
    "recent_anomalies": {
        "en": "Recent Anomalies",
        "hi": "हाल की विसंगतियाँ",
        "mr": "अलीकडील विसंगती",
    },
    "why_prioritized": {
        "en": "Why Prioritized",
        "hi": "प्राथमिकता क्यों",
        "mr": "प्राधान्य का",
    },
    "contributing_individuals": {
        "en": "Contributing Individuals",
        "hi": "योगदानकर्ता व्यक्ति",
        "mr": "योगदानकर्ते व्यक्ती",
    },
    "tactical_sequence": {
        "en": "Suggested Tactical Patrol Sequence",
        "hi": "सुझाई गई रणनीतिक गश्ती क्रम",
        "mr": "सुचवलेला रणनीतिक गस्त क्रम",
    },
    "prioritized_order": {
        "en": "Prioritized deployment order based on active tiger movements and risk signals:",
        "hi": "सक्रिय बाघ आंदोलन और जोखिम संकेतों के आधार पर प्राथमिकता क्रम:",
        "mr": "सक्रिय वाघ हालचाल व धोका संकेतांवर आधारित प्राधान्य क्रम:",
    },
    "objective": {
        "en": "Objective",
        "hi": "उद्देश्य",
        "mr": "उद्दिष्ट",
    },
    "no_sequence": {
        "en": "No suggested patrol sequence available.",
        "hi": "कोई सुझाई गई गश्ती क्रम उपलब्ध नहीं।",
        "mr": "सुचवलेला गस्त क्रम उपलब्ध नाही.",
    },
    "priority_trend": {
        "en": "Patrol Priority Trend: Station",
        "hi": "गश्ती प्राथमिकता रुझान: स्टेशन",
        "mr": "गस्त प्राधान्य क्रम: स्थानक",
    },
    "current_score": {
        "en": "Current Score",
        "hi": "वर्तमान स्कोर",
        "mr": "सध्याचा स्कोअर",
    },
    "trajectory": {
        "en": "Trajectory",
        "hi": "प्रक्षेपपथ",
        "mr": "क्रम",
    },
    "station": {
        "en": "Station",
        "hi": "स्टेशन",
        "mr": "स्थानक",
    },
    # ── action links ─────────────────────────────────────────────────────
    "view_map": {
        "en": "View on Map",
        "hi": "नक्शे पर देखें",
        "mr": "नकाशावर पहा",
    },
    "view_territory_map": {
        "en": "View Territory Map",
        "hi": "क्षेत्र नक्शा देखें",
        "mr": "क्षेत्र नकाशा पहा",
    },
    "view_identification": {
        "en": "View Identification",
        "hi": "पहचान देखें",
        "mr": "ओळख पहा",
    },
    "view_alerts": {
        "en": "View Alerts",
        "hi": "अलर्ट देखें",
        "mr": "सूचना पहा",
    },
    "view_all_alerts": {
        "en": "View All Alerts",
        "hi": "सभी अलर्ट देखें",
        "mr": "सर्व सूचना पहा",
    },
    "run_triage": {
        "en": "Run Triage",
        "hi": "ट्रायेज चलाएँ",
        "mr": "चाळणी चालवा",
    },
    "view_triage": {
        "en": "View Triage",
        "hi": "ट्रायेज देखें",
        "mr": "चाळणी पहा",
    },
    "dashboard": {
        "en": "Dashboard",
        "hi": "डैशबोर्ड",
        "mr": "डॅशबोर्ड",
    },
    "review_queue_link": {
        "en": "Review Queue",
        "hi": "समीक्षा कतार",
        "mr": "पुनरावलोकन रांग",
    },
    "patrol_intelligence": {
        "en": "Patrol Intelligence",
        "hi": "गश्ती बुद्धिमत्ता",
        "mr": "गस्त बुद्धिमत्ता",
    },
    "patrol_board_link": {
        "en": "Patrol Board",
        "hi": "गश्ती बोर्ड",
        "mr": "गस्त मंडळ",
    },
    "see_help": {
        "en": "See Help",
        "hi": "सहायता देखें",
        "mr": "मदत पहा",
    },
    "see_all_commands": {
        "en": "See All Commands",
        "hi": "सभी आदेश देखें",
        "mr": "सर्व आदेश पहा",
    },
    # ── help / unknown / error ────────────────────────────────────────────
    "help_title": {
        "en": "Pench AI Conservation Intelligence Assistant",
        "hi": "पेंच एआई संरक्षण बुद्धिमत्ता सहायक",
        "mr": "पेंच एआय संरक्षण बुद्धिमत्ता सहाय्यक",
    },
    "help_intro": {
        "en": "I can answer questions about the Pench Tiger Reserve using our local database. Here's what I know about:",
        "hi": "मैं स्थानीय डेटाबेस से पेंच टाइगर रिजर्व के बारे में प्रश्नों के उत्तर दे सकता हूँ। मैं जानता हूँ:",
        "mr": "मी स्थानिक डेटाबेसवरून पेंच टायगर रिझर्व्हबद्दल प्रश्नांची उत्तरे देऊ शकतो. मला माहीत आहे:",
    },
    "help_tigers": {
        "en": "Tigers",
        "hi": "बाघ",
        "mr": "वाघ",
    },
    "help_territory": {
        "en": "Territory & Movement",
        "hi": "क्षेत्र और आंदोलन",
        "mr": "क्षेत्र आणि हालचाल",
    },
    "help_alerts": {
        "en": "Alerts & Safety",
        "hi": "अलर्ट और सुरक्षा",
        "mr": "सूचना आणि सुरक्षा",
    },
    "help_monitoring": {
        "en": "Monitoring",
        "hi": "निगरानी",
        "mr": "निगराणी",
    },
    "help_footer": {
        "en": "All responses are generated from local data. No internet required.",
        "hi": "सभी उत्तर स्थानीय डेटा से बनते हैं। इंटरनेट आवश्यक नहीं।",
        "mr": "सर्व उत्तरे स्थानिक डेटावरून तयार होतात. इंटरनेट आवश्यक नाही.",
    },
    "not_sure": {
        "en": "I'm not sure I understand that question.",
        "hi": "मुझे इस प्रश्न को समझने में संदेह है।",
        "mr": "मला हा प्रश्न समजण्यात शंका आहे.",
    },
    "you_mentioned": {
        "en": "I noticed you mentioned",
        "hi": "मैंने देखा कि आपने उल्लेख किया",
        "mr": "मला आढळले की तुम्ही उल्लेख केला",
    },
    "try_asking_like": {
        "en": "Try asking something like",
        "hi": "ऐसा प्रश्न पूछने का प्रयास करें",
        "mr": "असा प्रश्न विचारून पहा",
    },
    "try_asking_questions": {
        "en": "Try asking questions like:",
        "hi": "इस तरह के प्रश्न पूछने का प्रयास करें:",
        "mr": "असे प्रश्न विचारून पहा:",
    },
    "type_help": {
        "en": 'Type "help" for a full list of what I can do.',
        "hi": 'वह सब देखने के लिए "help" लिखें जो मैं कर सकता हूँ।',
        "mr": 'मी काय करू शकतो ते पाहण्यासाठी "help" लिहा.',
    },
    "error_processing": {
        "en": "I encountered an error processing your question. Please try rephrasing or type \"help\".",
        "hi": "आपका प्रश्न संसाधित करते समय त्रुटि हुई। कृपया दोबारा प्रयास करें या \"help\" लिखें।",
        "mr": "तुमचा प्रश्न प्रक्रिया करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा किंवा \"help\" लिहा.",
    },
}


def T(lang: str, key: str) -> str:
    """Localized template lookup; falls back to English, then to the key."""
    entry = L.get(key)
    if not entry:
        return key
    return entry.get(lang) or entry.get("en") or key
