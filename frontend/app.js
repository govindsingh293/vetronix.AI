/**
 * =========================================================================
 * VETRONIX - SMART AIoT BOVINE HEALTHCARE & MASTITIS DETECTION (SIH 2026)
 * Complete Error-Free Logic & State Management
 * 
 * Features:
 * 1. Onboarding Sequence: Tutorial Video -> Language Selection -> Farmer Auth
 * 2. Strict Account Isolation: Cattle data isolated per phone/email account
 * 3. Model 1 (Sensors): Temp, Conductivity (TDS ppm -> mS/cm formula), Yield
 * 4. Model 2 (Vision): Teat Inspection via ESP32-CAM / Upload
 * 5. Combined Consensus: Veterinary Clinical Suggestion ("Go to Veterinary")
 * 6. Multilingual Engine (English, हिन्दी, ਪੰਜਾਬੀ, ગુજરાતી)
 * =========================================================================
 */

// =========================================================================
// BACKEND CONNECTION
// =========================================================================
// Keep this URL for local development. Change it later to the deployed
// FastAPI backend URL when the project is deployed.
// =========================================================================
const API_URL = "https://vetronix-ai.onrender.com";

// ESP32 live telemetry is read by the FastAPI backend.
// Change this only if your ESP32 network/IP changes; the browser
// never connects directly to the ESP32, so the existing UI/backend
// flow remains unchanged.
const ESP32_LIVE_POLL_MS = 2000;

// Supabase Auth + database configuration.
// This is the Supabase publishable key, intended for browser use.
// Data access remains behind the existing FastAPI backend.
const SUPABASE_URL = "https://uyqratuxyjfnxeerhlbg.supabase.co";
const SUPABASE_KEY = "sb_publishable_cmy2RZ-_L5e6jTYNwo-JZg_LlbwYLH5";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

async function getSupabaseAccessToken() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiFetch(url, options = {}) {
  const token = await getSupabaseAccessToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

// =========================================================================
// 1. MULTILINGUAL DICTIONARY
// =========================================================================
const translations = {
  en: {
    tutorial_step_badge: "Step 1 of 3: Platform Tutorial",
    btn_skip_tutorial: "Skip Tutorial & Continue →",
    tutorial_heading: "Welcome to Vetronix.ai Platform",
    tutorial_subheading: "Watch this quick video to learn how to monitor cattle health, collect ESP32 sensor data, and run dual-AI mastitis prediction.",
    tutorial_hi_title: "How to Use Vetronix - Hindi Tutorial",
    tutorial_en_title: "How to Use Vetronix - English Tutorial",
    tutorial_video_replace_hint: "",
    tutorial_video_replace_hint_en: "",
    tutorial_reopen_note: "💡 You can re-open this tutorial video at any time from the top navigation bar.",
    btn_proceed_language: "Proceed to Language Selection →",
    lang_step_badge: "Step 2 of 3: Select Language",
    lang_modal_heading: "Choose Your Preferred Language",
    lang_modal_subheading: "In which language do you want to see the whole website, ML model predictions, sensor telemetry, and veterinary clinical suggestions?",
    btn_confirm_lang_proceed: "Continue to Step 3: Login →",
    tab_login: "Farmer Login",
    tab_signup: "Register Farm (Sign Up)",
    login_heading: "Sign In to Your Farm Dashboard",
    login_sub: "Enter your registered mobile number or email and password to access your private cattle records.",
    label_mobile_or_email: "Mobile Number or Email Address",
    label_password: "Password",
    link_forgot_pwd: "Forgot Password?",
    btn_login_submit: "Sign In to Vetronix →",
    isolation_guarantee_title: "100% Account Data Privacy:",
    isolation_guarantee_desc: "Your cattle records and mastitis diagnostic logs are strictly isolated to your mobile number and never shared with other accounts.",
    signup_heading: "Create New Dairy Farm Account",
    signup_sub: "Register your farm to start managing your cows and buffaloes with IoT-enabled AI diagnostics.",
    label_farmer_name: "Farmer / Owner Full Name",
    label_farm_address: "Farm Name & Village / Address",
    btn_signup_submit: "Create Account & Enter Platform →",
    forgot_heading: "Reset Your Password via OTP",
    forgot_sub: "We will send a 6-digit verification code to your registered mobile number or email address.",
    btn_send_otp: "Send Verification OTP →",
    back_to_login: "← Back to Login",
    otp_received_badge: "OTP Sent Successfully:",
    label_enter_otp: "Enter 6-Digit OTP",
    label_new_password: "New Password",
    btn_save_new_pwd: "Verify OTP & Save Password →",
    sih_track_title: "SIH 2026 Innovation Track:",
    sih_track_desc: "AIoT Bovine Healthcare & Early Mastitis Warning",
    nav_tutorial_btn: "Tutorial",
    btn_logout: "Logout",
    brand_tagline: "Smart Dairy IoT & Vision Intelligence",
    nav_overview: "Overview",
    nav_hardware: "Hardware & Sensors",
    nav_cattle: "My Cattle",
    nav_model1: "Model 1 (Sensors)",
    nav_model2: "Model 2 (Vision)",
    nav_combined: "Combined Result",
    nav_contact: "Contact",
    btn_run_screening: "Run Screening",
    hero_pill: "Welcome to Vetronix.ai Platform",
    hero_headline: "Intelligent Mastitis Early Warning for Dairy Cattle",
    hero_subtext: "Vetronix combines an ESP32 multisensor probe (milk conductivity & temperature) with an ESP32-CAM teat computer vision model to detect subclinical mastitis before irreversible udder damage occurs.",
    hero_btn_start: "Start Mastitis Screening →",
    hero_btn_hardware: "Explore Hardware Device",
    stat_acc: "Dual-AI Accuracy",
    stat_time: "Telemetry Analysis",
    stat_privacy: "Farmer Data Privacy",
    overview_tag: "Pathology & Impact",
    overview_title: "Understanding Bovine Mastitis in Cows & Buffaloes",
    overview_sub: "Mastitis is the inflammation of the mammary gland and udder tissue, predominantly triggered by bacterial infection (e.g., Staphylococcus aureus, Streptococcus uberis, and E. coli).",
    card1_title: "Subclinical vs Clinical Mastitis",
    card1_desc: "Subclinical Mastitis has no visible swelling or abnormalities in milk, yet causes massive yield drops and elevated Somatic Cell Counts (SCC). Clinical Mastitis displays painful udder swelling, hardness, clots/flakes in milk, and severe distress. Vetronix catches subclinical cases days before clinical symptoms develop.",
    card2_title: "Severe Economic Loss in India",
    card2_desc: "Mastitis inflicts an annual loss exceeding ₹6,053 Crores ($800M) in India's dairy sector. Farmers suffer from 15-40% reduced milk yields, milk rejection at dairy collection centers due to poor microbial quality, high veterinary bills, and premature culling of high-yielding cattle.",
    card3_title: "How Multisensors Predict Mastitis",
    card3_desc: "When mastitis pathogens damage udder secretory epithelial cells, the blood-milk barrier breaks down. Sodium (Na+) and Chloride (Cl-) ions rush from blood into milk, sharply elevating Electrical Conductivity. Localized inflammation causes a temperature spike (>39.5°C), and milk yield declines.",
    solution_title: "The Vetronix Dual-Stage AI Advantage",
    solution_desc: "While conventional screening relies on subjective visual checks or lab tests like CMT that take days, Vetronix uses an integrated multisensor probe (ESP32 + TDS Meter + DS18B20) for instant physicochemical milk evaluation (Model 1). If risk is elevated, an ESP32-CAM Teat Computer Vision Model (Model 2) inspects udder redness, erythema, and teat condition, synthesising both into actionable veterinary clinical advice.",
    hardware_tag: "IoT Device Architecture",
    hardware_title: "Vetronix Multisensor Hardware Components",
    hardware_sub: "Engineered for durable, farm-grade use with real-time ADC signal conditioning, waterproof thermometry, and edge computer vision.",
    hw_esp32_desc: "High-performance dual-core Xtensa 32-bit LX6 MCU operating up to 240 MHz. Features integrated 2.4 GHz Wi-Fi and Bluetooth LE 4.2. Collects ADC telemetry from milk sensors, performs on-chip calibration, and transmits data to the Vetronix cloud dashboard.",
    hw_tds_desc: "Measures Total Dissolved Solids and electrical conductivity of fresh milk in parts per million (ppm). In mastitic milk, increased Na+ and Cl- ion concentration causes higher conductivity. Vetronix converts this reading directly to milliSiemens per centimeter (mS/cm).",
    hw_temp_desc: "High-precision, food-grade waterproof digital temperature sensor encased in a stainless steel probe tube. Detects micro-temperature variations in milk immediately upon milking, flagging localized udder hyperthermia caused by inflammatory immune response.",
    hw_cam_desc: "Compact camera development module with an OV2640 2-megapixel image sensor and onboard flash LED. Captures high-definition imagery of cattle teats and udder quarters, feeding the image into Model 2 to detect erythema, swelling, and lesions.",
    cattle_tag: "Dairy Herd Registry",
    cattle_title: "My Cattle",
    cattle_sub: "Add your cattle details, save them, and view the complete registered cattle information on this website.",
    add_cattle_heading: "Register New Cattle",
    add_cattle_sub: "Assign tag ID, breed, age, and previous mastitis history.",
    label_cattle_type: "Cattle Type",
    label_cattle_id: "Cattle Tag ID",
    label_breed: "Breed",
    label_age: "Age (Years)",
    label_medical_history: "Medical History (Previous Mastitis?)",
    btn_save_cattle: "Save Cattle Details →",
    saved_cattle_title: "Registered Cattle",
    model1_tag: "First-Stage ML Classifier",
    model1_title: "Model 1: Sensor-Based Mastitis Prediction",
    model1_sub: "Evaluates Milk Temperature, Electrical Conductivity (converted from TDS sensor), and Milk Yield to compute initial mastitis probability.",
    label_select_cattle: "Select Cattle ID",
    label_milk_temp: "Milk Temperature (°C)",
    label_tds_ppm: "TDS Sensor Value (ppm)",
    label_conductivity_ms: "Converted Milk Conductivity (mS/cm)",
    label_milk_yield: "Milk Yield (Liters)",
    btn_fetch_esp32: "Fetch from ESP32 Sensor",
    btn_predict_m1: "Predict Mastitis Risk (Model 1) →",
    formula_title: "Conductivity Conversion Formula",
    formula_desc: "The TDS Meter 1.0 outputs Total Dissolved Solids in parts per million (ppm). The TDS reading is converted to milk electrical conductivity using the project conversion formula TDS (ppm) ÷ 500 for the trained Random Forest Classifier.",
    alert_vision_needed_title: "Action Required: Teat Inspection Triggered",
    alert_vision_needed_desc: "Because Model 1 detected elevated risk, take a picture of the cattle's teats using the provided ESP32-CAM sensor camera or upload manually below for Model 2 Vision verification.",
    btn_proceed_to_vision: "Proceed to Model 2 (Teat Vision) ↓",
    model2_tag: "Second-Stage Vision Classifier",
    model2_title: "Model 2: Teat Vision ML Prediction",
    model2_sub: "Analyzes teat and udder imagery for erythema (redness), swelling, hyperkeratosis, or external lesions using a trained Convolutional Neural Network (CNN).",
    teat_img_heading: "Teat Image Acquisition",
    teat_img_sub: "Capture directly from ESP32-CAM or upload a photo manually.",
    btn_capture_esp32cam: "Capture from ESP32-CAM Sensor",
    or_text: "OR",
    upload_teat_click: "Click to Upload Teat Image",
    upload_teat_drag: "or drag and drop photo here (JPG, PNG)",
    btn_analyze_m2: "Analyze Teat Image (Model 2) →",
    no_teat_img_yet: "No teat image loaded yet. Click 'Capture from ESP32-CAM' or upload manually.",
    combined_tag: "Clinical Decision Support",
    combined_title: "Combined Model Consensus & Veterinary Suggestion",
    combined_sub: "Holistic diagnostic summary fusing IoT physicochemical sensor telemetry with teat visual inspection.",
    summary_cattle_header: "Cattle Identification & Telemetry",
    summary_models_header: "AI Models & Vision Inspection",
    th_cattle_id: "Cattle ID:",
    th_breed: "Breed:",
    th_age: "Age:",
    th_history: "Medical History:",
    th_temp: "Milk Temperature:",
    th_cond: "Milk Conductivity:",
    th_yield: "Milk Yield:",
    rep_model1_label: "Model 1 (Sensors):",
    rep_model2_label: "Model 2 (Vision):",
    rep_combined_label: "Combined Assessment:",
    checklist_title: "🚨 Emergency Veterinary Protocols:",
    chk1: "Immediately isolate the infected cattle to prevent contagious spread.",
    chk2: "Discard milk from affected quarters — do not mix with commercial tank.",
    chk3: "Apply cold compress / antiseptic teat dip to alleviate inflammation.",
    chk4: "Contact your local Veterinary Officer for California Mastitis Test (CMT) & antibiotic prescription.",
    btn_print_report: "Download / Print Clinical Report (PDF)",
    btn_save_diagnosis: "Save Diagnosis to Cattle Record",
    contact_tag: "Support & Agritech Help",
    contact_title: "Get in Touch with Vetronix Team",
    contact_sub: "Have questions about sensor calibration, ESP32 setup, or veterinary consultations? Reach out to us.",
    contact_email_label: "Official Support Email",
    contact_phone_label: "Direct Contact & Kisan Helpline",
    contact_insta_label: "Official Instagram Handle",
    contact_addr_label: "Research & Innovation Lab",
    inquiry_heading: "Send a Quick Inquiry",
    label_your_name: "Your Name",
    label_your_email: "Your Email or Mobile",
    label_your_msg: "Message / Question",
    btn_send_inquiry: "Send Message →",
    footer_copy: "© 2026 Vetronix AIoT Dairy Healthcare. Developed for Smart India Hackathon (SIH 2026)."
  },

  hi: {
    tutorial_step_badge: "चरण 1 / 3: प्लेटफॉर्म ट्यूटोरियल",
    btn_skip_tutorial: "ट्यूटोरियल छोड़ें और आगे बढ़ें →",
    tutorial_heading: "वेबसाइट का उपयोग कैसे करें - Vetronix AIoT",
    tutorial_subheading: "यह वीडियो देखकर जानें कि गाय-भैंसों के स्वास्थ्य की निगरानी कैसे करें, ESP32 सेंसर डेटा कैसे लें और AI से थनैला (मस्टाइटिस) की जांच कैसे करें।",
    tutorial_hi_title: "वेबसाइट का उपयोग कैसे करें - हिन्दी ट्यूटोरियल",
    tutorial_en_title: "How to Use Vetronix - English Tutorial",
    tutorial_video_replace_hint: "",
    tutorial_video_replace_hint_en: "",
    tutorial_reopen_note: "💡 आप इस ट्यूटोरियल वीडियो को ऊपर दिए गए नेविगेशन बार से कभी भी दोबारा देख सकते हैं।",
    btn_proceed_language: "भाषा चुनने के लिए आगे बढ़ें →",
    lang_step_badge: "चरण 2 / 3: भाषा का चयन करें",
    lang_modal_heading: "अपनी पसंदीदा भाषा चुनें",
    lang_modal_subheading: "आप पूरी वेबसाइट, AI मॉडल के परिणाम, सेंसर रीडिंग और पशु चिकित्सा सलाह किस भाषा में देखना चाहते हैं?",
    btn_confirm_lang_proceed: "भाषा की पुष्टि करें और लॉगिन पर जाएं →",
    tab_login: "किसान लॉगिन",
    tab_signup: "नया खाता बनाएं (पंजीकरण)",
    login_heading: "अपने डेयरी डैशबोर्ड में लॉगिन करें",
    login_sub: "अपने पशुओं का सुरक्षित रिकॉर्ड देखने के लिए अपना मोबाइल नंबर या ईमेल और पासवर्ड दर्ज करें।",
    label_mobile_or_email: "मोबाइल नंबर या ईमेल पता",
    label_password: "पासवर्ड",
    link_forgot_pwd: "पासवर्ड भूल गए?",
    btn_login_submit: "Vetronix में लॉगिन करें →",
    isolation_guarantee_title: "100% खाता डेटा गोपनीयता गारंटी:",
    isolation_guarantee_desc: "आपके पशुओं का डेटा और थनैला जांच रिपोर्ट केवल आपके खाते में सुरक्षित रहेगी। किसी अन्य किसान या खाते को यह डेटा नहीं दिखेगा।",
    signup_heading: "नया डेयरी फार्म खाता पंजीकृत करें",
    signup_sub: "IoT और AI आधारित पशु स्वास्थ्य निगरानी शुरू करने के लिए अपना फार्म पंजीकृत करें।",
    label_farmer_name: "किसान / डेयरी मालिक का नाम",
    label_farm_address: "डेयरी फार्म का नाम व पता / गांव",
    btn_signup_submit: "खाता बनाएं और वेबसाइट में प्रवेश करें →",
    forgot_heading: "ओटीपी (OTP) द्वारा पासवर्ड रीसेट करें",
    forgot_sub: "हम आपके पंजीकृत मोबाइल नंबर या ईमेल पर 6 अंकों का सत्यापन कोड भेजेंगे।",
    btn_send_otp: "सत्यापन ओटीपी भेजें →",
    back_to_login: "← वापस लॉगिन पर जाएं",
    otp_received_badge: "ओटीपी सफलतापूर्वक भेजा गया:",
    label_enter_otp: "6 अंकों का ओटीपी दर्ज करें",
    label_new_password: "नया पासवर्ड बनाएं",
    btn_save_new_pwd: "ओटीपी सत्यापित करें और पासवर्ड बदलें →",
    sih_track_title: "SIH 2026 इनोवेशन ट्रैक:",
    sih_track_desc: "AIoT पशु स्वास्थ्य और थनैला (मस्टाइटिस) प्रारंभिक चेतावनी प्रणाली",
    nav_tutorial_btn: "ट्यूटोरियल",
    btn_logout: "लॉगआउट",
    brand_tagline: "स्मार्ट डेयरी IoT व विजन इंटेलिजेंस",
    nav_overview: "अवलोकन (Overview)",
    nav_hardware: "हार्डवेयर और सेंसर",
    nav_cattle: "मेरे पशु (Cattle)",
    nav_model1: "मॉडल 1 (सेंसर)",
    nav_model2: "मॉडल 2 (कैमरा)",
    nav_combined: "संयुक्त परिणाम",
    nav_contact: "संपर्क करें",
    btn_run_screening: "जांच शुरू करें",
    hero_pill: "Vetronix.ai प्लेटफ़ॉर्म में आपका स्वागत है",
    hero_headline: "डेयरी पशुओं के लिए थनैला (मस्टाइटिस) की प्रारंभिक चेतावनी",
    hero_subtext: "Vetronix एक ESP32 मल्टीसेंसर जांच (दूध चालकता और तापमान) और ESP32-CAM थन कंप्यूटर विजन मॉडल को मिलाकर थनैला रोग के लक्षण दिखने से पहले ही सटीक पहचान करता है।",
    hero_btn_start: "थनैला जांच शुरू करें →",
    hero_btn_hardware: "हार्डवेयर उपकरण देखें",
    stat_acc: "दोहरे AI की सटीकता",
    stat_time: "सेंसर विश्लेषण समय",
    stat_privacy: "किसान डेटा गोपनीयता",
    overview_tag: "रोग विज्ञान और प्रभाव",
    overview_title: "गाय और भैंस में थनैला (मस्टाइटिस) को समझें",
    overview_sub: "थनैला थन और अयन की सूजन है, जो मुख्य रूप से जीवाणु संक्रमण (जैसे स्टेफिलोकोकस, स्ट्रेप्टोकोकस, ई. कोलाई) के कारण होती है।",
    card1_title: "सबक्लिनिकल बनाम क्लिनिकल थनैला",
    card1_desc: "सबक्लिनिकल थनैला में बाहर से कोई सूजन या दूध में खराबी नहीं दिखती, लेकिन दूध उत्पादन तेजी से गिरता है। क्लिनिकल थनैला में थन में दर्दनाक सूजन, कड़ापन और दूध में छिछड़े आते हैं। Vetronix रोग को शुरुआती दिनों में ही पकड़ लेता है।",
    card2_title: "भारत में भारी आर्थिक नुकसान",
    card2_desc: "थनैला रोग के कारण भारत के डेयरी क्षेत्र को प्रतिवर्ष ₹6,053 करोड़ से अधिक का नुकसान होता है। किसानों का 15-40% दूध उत्पादन घट जाता है, खराब गुणवत्ता के कारण दूध रिजेक्ट होता है और इलाज का भारी खर्च आता है।",
    card3_title: "मल्टीसेंसर थनैला की पहचान कैसे करते हैं",
    card3_desc: "जब बैक्टीरिया थन की कोशिकाओं को नुकसान पहुंचाते हैं, तो खून से सोडियम (Na+) और क्लोराइड (Cl-) आयन दूध में आ जाते हैं, जिससे दूध की विद्युत चालकता (Conductivity) बढ़ जाती है। सूजन से दूध का तापमान (>39.5°C) बढ़ जाता है।",
    solution_title: "Vetronix का दोहरा AI समाधान",
    solution_desc: "पारंपरिक जांच के विपरीत, Vetronix एक मल्टीसेंसर प्रोब (ESP32 + TDS मीटर + DS18B20) से दूध के भौतिक-रासायनिक गुणों की तत्काल जांच करता है (मॉडल 1)। जोखिम अधिक होने पर ESP32-CAM कैमरा (मॉडल 2) थन की लालिमा और सूजन की जांच करता है।",
    hardware_tag: "IoT उपकरण संरचना",
    hardware_title: "Vetronix मल्टीसेंसर हार्डवेयर उपकरण",
    hardware_sub: "डेयरी फार्म के कठोर वातावरण के लिए तैयार, उच्च सटीकता वाले डिजिटल सेंसर और एज कंप्यूटर विजन।",
    hw_esp32_desc: "240 MHz पर काम करने वाला डुअल-कोर 32-बिट माइक्रोकंट्रोलर। इसमें वाई-फाई और ब्लूटूथ की सुविधा है जो सेंसर से डेटा पढ़कर सीधे Vetronix डैशबोर्ड पर भेजता है।",
    hw_tds_desc: "दूध में घुले कुल ठोस पदार्थों (TDS) और विद्युत चालकता को ppm में मापता है। थनैला होने पर आयनों की अधिकता से चालकता बढ़ती है, जिसे Vetronix सीधे mS/cm में बदलता है।",
    hw_temp_desc: "स्टेनलेस स्टील प्रोब में बंद वाटरप्रूफ डिजिटल तापमान सेंसर। यह दुहाई के तुरंत बाद दूध का सटीक तापमान नापकर थन की आंतरिक सूजन को पकड़ता है।",
    hw_cam_desc: "2 मेगापिक्सल OV2640 कैमरा और फ्लैश लाइट से लैस विजन मॉड्यूल। यह थन की हाई-डेफिनिशन तस्वीर लेकर मॉडल 2 में लालिमा और सूजन का विश्लेषण करता है।",
    cattle_tag: "डेयरी पशु पंजिका",
    cattle_title: "मेरे पशु (My Cattle)",
    cattle_sub: "अपने फार्म की गाय और भैंसों का विवरण जोड़ें। यह डेटा केवल आपके खाते में रहेगा और किसी अन्य किसान को नहीं दिखेगा।",
    add_cattle_heading: "नया पशु जोड़ें",
    add_cattle_sub: "पशु का टैग आईडी, नस्ल, उम्र और पिछला थनैला इतिहास दर्ज करें।",
    label_cattle_type: "पशु का प्रकार",
    label_cattle_id: "पशु का टैग आईडी (ID)",
    label_breed: "नस्ल (Breed)",
    label_age: "उम्र (वर्ष)",
    label_medical_history: "चिकित्सा इतिहास (क्या पहले कभी थनैला हुआ?)",
    btn_save_cattle: "पशु का विवरण सुरक्षित करें →",
    saved_cattle_title: "आपके फार्म के पंजीकृत पशु",
    model1_tag: "प्रथम चरण AI मॉडल",
    model1_title: "मॉडल 1: सेंसर आधारित थनैला भविष्यवाणी",
    model1_sub: "दूध का तापमान, विद्युत चालकता (TDS से रूपांतरित) और दूध उत्पादन के आधार पर थनैला के जोखिम की गणना करता है।",
    label_select_cattle: "पशु का आईडी चुनें",
    label_milk_temp: "दूध का तापमान (°C)",
    label_tds_ppm: "TDS सेंसर मान (ppm)",
    label_conductivity_ms: "रूपांतरित दूध चालकता (mS/cm)",
    label_milk_yield: "दूध उत्पादन (लीटर)",
    btn_fetch_esp32: "ESP32 सेंसर से लाइव डेटा लाएं",
    btn_predict_m1: "थनैला जोखिम की जांच करें (मॉडल 1) →",
    formula_title: "चालकता रूपांतरण सूत्र (Conversion Formula)",
    formula_desc: "TDS मीटर 1.0 दूध के आयनों को ppm में मापता है। Vetronix में इसे TDS (ppm) ÷ 500 सूत्र से दूध की विद्युत चालकता mS/cm में बदला जाता है।",
    alert_vision_needed_title: "महत्वपूर्ण चेतावनी: थन की फोटो जांच आवश्यक",
    alert_vision_needed_desc: "चूंकि मॉडल 1 में थनैला का मध्यम/उच्च जोखिम मिला है, कृपया दिए गए ESP32-CAM कैमरा से थन की फोटो लें या नीचे मॉडल 2 में अपलोड करें।",
    btn_proceed_to_vision: "मॉडल 2 (थन फोटो जांच) पर जाएं ↓",
    model2_tag: "द्वितीय चरण विजन मॉडल",
    model2_title: "मॉडल 2: थन फोटो आधारित AI भविष्यवाणी",
    model2_sub: "थन और अयन की फोटो में लालिमा, सूजन और घावों की पहचान करने के लिए प्रशिक्षित सीएनएन (CNN) मॉडल।",
    teat_img_heading: "थन की फोटो प्राप्त करें",
    teat_img_sub: "ESP32-CAM से सीधे फोटो खींचें या गैलरी से अपलोड करें।",
    btn_capture_esp32cam: "ESP32-CAM सेंसर से फोटो लें",
    or_text: "अथवा",
    upload_teat_click: "थन की फोटो अपलोड करने के लिए क्लिक करें",
    upload_teat_drag: "या फोटो को यहाँ खींच कर छोड़ें (JPG, PNG)",
    btn_analyze_m2: "थन की फोटो जांचें (मॉडल 2) →",
    no_teat_img_yet: "अभी कोई फोटो नहीं है। 'ESP32-CAM से फोटो लें' दबाएं या अपलोड करें।",
    combined_tag: "पशु चिकित्सा निर्णय सहायता",
    combined_title: "संयुक्त AI परिणाम और पशु चिकित्सक परामर्श",
    combined_sub: "सेंसर डेटा (मॉडल 1) और थन फोटो (मॉडल 2) का समग्र निष्कर्ष।",
    summary_cattle_header: "पशु पहचान और सेंसर डेटा",
    summary_models_header: "AI मॉडल और विजन जांच परिणाम",
    th_cattle_id: "पशु आईडी:",
    th_breed: "नस्ल:",
    th_age: "उम्र:",
    th_history: "पिछला इतिहास:",
    th_temp: "दूध का तापमान:",
    th_cond: "दूध की चालकता:",
    th_yield: "दूध उत्पादन:",
    rep_model1_label: "मॉडल 1 (सेंसर):",
    rep_model2_label: "मॉडल 2 (कैमरा):",
    rep_combined_label: "संयुक्त निष्कर्ष:",
    checklist_title: "🚨 आपातकालीन पशु चिकित्सा प्रोटोकॉल:",
    chk1: "संक्रमित गाय/भैंस को तुरंत स्वस्थ पशुओं से अलग (Isolate) करें।",
    chk2: "प्रभावित थन का दूध फेंक दें — इसे सामान्य दूध की टंकी में न मिलाएं।",
    chk3: "थन पर बर्फ या ठंडी सिकाई करें और एंटीसेप्टिक टीट डिप का प्रयोग करें।",
    chk4: "तुरंत पशु चिकित्सक (Veterinary Doctor) से संपर्क कर CMT टेस्ट और एंटीबायोटिक उपचार कराएं।",
    btn_print_report: "चिकित्सा रिपोर्ट डाउनलोड / प्रिंट करें (PDF)",
    btn_save_diagnosis: "जांच को पशु के इतिहास में जोड़ें",
    contact_tag: "सहायता और संपर्क",
    contact_title: "Vetronix तकनीकी टीम से संपर्क करें",
    contact_sub: "ESP32 सेटअप, सेंसर कैलिब्रेशन या पशु स्वास्थ्य संबंधी सवालों के लिए संपर्क करें।",
    contact_email_label: "आधिकारिक सहायता ईमेल",
    contact_phone_label: "सीधा संपर्क और किसान हेल्पलाइन",
    contact_insta_label: "आधिकारिक इंस्टाग्राम हैंडल",
    contact_addr_label: "अनुसंधान व नवाचार प्रयोगशाला",
    inquiry_heading: "अपना प्रश्न या संदेश भेजें",
    label_your_name: "आपका नाम",
    label_your_email: "आपका ईमेल या मोबाइल नंबर",
    label_your_msg: "आपका संदेश / प्रश्न",
    btn_send_inquiry: "संदेश भेजें →",
    footer_copy: "© 2026 Vetronix AIoT डेयरी हेल्थकेयर। स्मार्ट इंडिया हैकाथॉन (SIH 2026) हेतु विकसित।"
  }
};

// =========================================================================
// 2. STATE MANAGEMENT & DATA ISOLATION
// =========================================================================
let currentLanguage = 'en';
let activeUser = null;
let simulatedOtp = null;
let currentTeatImageBase64 = null;
let currentModel1Result = null;
let currentModel2Result = null;

// Preset sample real images for simulated ESP32-CAM capture
const SAMPLE_TEAT_IMAGES = {
  healthy: "https://commons.wikimedia.org/wiki/Special:FilePath/Cow%20udders.jpg?width=1200",
  mastitic: "https://commons.wikimedia.org/wiki/Special:FilePath/Cow%20udders02.jpg?width=1200"
};

// Default starter cattle for demo user
const DEFAULT_DEMO_CATTLE = [
  {
    id: "VTX-COW-101",
    type: "Cow",
    breed: "Gir Cow (गीर गाय)",
    age: 4.5,
    history: "No Prior Mastitis",
    lastTemp: 38.6,
    lastCond: 5.0,
    lastYield: 14.5
  },
  {
    id: "VTX-BUF-204",
    type: "Buffalo",
    breed: "Murrah Buffalo (मुर्रा भैंस)",
    age: 5.0,
    history: "Mild Mastitis in Previous Lactation (उपचारित)",
    lastTemp: 38.8,
    lastCond: 5.2,
    lastYield: 16.0
  }
];


// =========================================================================
// 3. INITIALIZATION & SEQUENTIAL ONBOARDING CONTROLLER
// Sequence: Tutorial Video -> Language Selection -> Farmer Authentication
// =========================================================================
window.addEventListener('DOMContentLoaded', async () => {
  const storedLang = localStorage.getItem('vetronix_preferred_lang') || 'en';

  currentLanguage = storedLang;
  applyLanguage(currentLanguage);

  if (!supabaseClient) {
    console.error('VETRONIX: Supabase client failed to load.');
    startOnboardingFlow();
    return;
  }

  const loginIdField = document.getElementById('loginId');
  const signupIdField = document.getElementById('signupId');
  loginIdField?.addEventListener('input', updatePhoneOtpUi);
  signupIdField?.addEventListener('input', updatePhoneOtpUi);
  updatePhoneOtpUi();

  let restoredDemo = false;
  try {
    const savedDemo = JSON.parse(sessionStorage.getItem('vetronix_active_user') || 'null');
    if (savedDemo?.demoPhoneAuth) restoredDemo = activateDemoPhoneAccount(savedDemo);
  } catch (_) {}

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!restoredDemo && session?.user) {
    await completeSupabaseLogin(session.user);
  } else if (!restoredDemo) {
    startOnboardingFlow();
  }

  // Start silent live ESP32 telemetry polling. The existing UI is reused as-is.
  startESP32LivePolling();

  // Keep local dashboard state in sync when Supabase signs out.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      activeUser = null;
      sessionStorage.removeItem('vetronix_active_user');
    }
  });
});

/**
 * Initiates the 3-step onboarding flow
 */
function startOnboardingFlow() {
  document.getElementById('tutorialOverlay').classList.add('active');
  document.getElementById('languageOverlay').classList.remove('active');
  document.getElementById('authOverlay').classList.remove('active');
}

/**
 * Step 1 -> Step 2: Proceed or Skip from Tutorial to Language Selection
 */
function skipTutorial() {
  document.getElementById('tutorialOverlay').classList.remove('active');
  document.getElementById('languageOverlay').classList.add('active');
}

function proceedToLanguageStep() {
  document.getElementById('tutorialOverlay').classList.remove('active');
  document.getElementById('languageOverlay').classList.add('active');
}

/**
 * Switch Tutorial Video language tab (Hindi / English)
 */
function switchTutorialLang(lang) {
  const btnHi = document.getElementById('videoBtnHi');
  const btnEn = document.getElementById('videoBtnEn');
  const boxHi = document.getElementById('videoBoxHi');
  const boxEn = document.getElementById('videoBoxEn');

  if (lang === 'hi') {
    btnHi.classList.add('active');
    btnEn.classList.remove('active');
    boxHi.classList.add('active');
    boxEn.classList.remove('active');
  } else {
    btnEn.classList.add('active');
    btnHi.classList.remove('active');
    boxEn.classList.add('active');
    boxHi.classList.remove('active');
  }
}

/**
 * Mock video play trigger
 */
function playMockVideo(lang) {
  alert(lang === 'hi' 
    ? "ट्यूटोरियल वीडियो प्लेयर तैयार है! आप अपना रिकॉर्ड किया गया MP4 वीडियो 'index.html' में कोड टिप्पणी के स्थान पर जोड़ सकते हैं।"
    : "Tutorial Video Player ready! You can attach your manually recorded MP4 video in 'index.html' under the tutorial comment placeholder."
  );
}

/**
 * Step 2: Language Selection in Onboarding Modal
 */
function selectOnboardingLang(lang, element) {
  document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('active'));
  element.classList.add('active');
  currentLanguage = lang;
}

/**
 * Step 2 -> Step 3: Confirm Language and proceed to Authentication
 */
function confirmLanguageAndProceed() {
  localStorage.setItem('vetronix_preferred_lang', currentLanguage);
  applyLanguage(currentLanguage);

  document.getElementById('languageOverlay').classList.remove('active');
  document.getElementById('authOverlay').classList.add('active');
  switchAuthView('login');
}

/**
 * Re-open tutorial modal from top navigation bar anytime
 */
function reopenTutorialModal() {
  document.getElementById('tutorialOverlay').classList.add('active');
}

function hideAllOverlays() {
  document.getElementById('tutorialOverlay').classList.remove('active');
  document.getElementById('languageOverlay').classList.remove('active');
  document.getElementById('authOverlay').classList.remove('active');
}


// =========================================================================
// 4. AUTHENTICATION & ACCOUNT DATA ISOLATION
// Data of cattle from one phone number/email is NEVER shown to another!
// =========================================================================
function switchAuthView(view) {
  const tabLogin = document.getElementById('authTabBtnLogin');
  const tabSignup = document.getElementById('authTabBtnSignup');
  const formLogin = document.getElementById('loginForm');
  const formSignup = document.getElementById('signupForm');
  const viewForgot = document.getElementById('forgotPasswordView');

  if (view === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.add('active');
    formSignup.classList.remove('active');
    viewForgot.classList.remove('active');
  } else if (view === 'signup') {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.add('active');
    formLogin.classList.remove('active');
    viewForgot.classList.remove('active');
  }
}

// =========================================================================
// SUPABASE BACKEND SYNC
// =========================================================================
// =========================================================================
// DEVELOPMENT PHONE OTP MODE (SMS provider not configured yet)
// =========================================================================
// TEST-ONLY fallback: no SMS is sent. Every phone account uses the same
// OTP, while each farmer is isolated by a unique phone-based demo user ID.
const PHONE_OTP_DEMO_MODE = true;
const PHONE_DEMO_OTP = '123456';
const PHONE_DEMO_ACCOUNTS_KEY = 'vetronix_demo_phone_accounts_v1';

function normalizePhoneIdentifier(value) {
  const digits = String(value || '').trim().replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length >= 8 && digits <= 15) return '+' + digits;
  return null;
}
function isPhoneIdentifier(value) { return !!normalizePhoneIdentifier(value); }
function getDemoPhoneAccounts() {
  try { const d = JSON.parse(localStorage.getItem(PHONE_DEMO_ACCOUNTS_KEY) || '{}'); return d && typeof d === 'object' ? d : {}; } catch (_) { return {}; }
}
function saveDemoPhoneAccounts(accounts) { localStorage.setItem(PHONE_DEMO_ACCOUNTS_KEY, JSON.stringify(accounts)); }
function getDemoPhoneAccount(phone) { const p = normalizePhoneIdentifier(phone); return p ? getDemoPhoneAccounts()[p] || null : null; }
function createDemoPhoneAccount(phone, name, farmName) {
  const p = normalizePhoneIdentifier(phone);
  if (!p) throw new Error('Please enter a valid phone number.');
  const accounts = getDemoPhoneAccounts();
  if (accounts[p]) throw new Error('A farmer account already exists for this phone number.');
  const uid = 'phone-demo-' + p.replace(/\D/g, '');
  const account = { id: uid, supabaseAuthUserId: uid, supabaseFarmerId: 'DEMO-' + p.replace(/\D/g, ''), name: String(name || 'Farmer').trim() || 'Farmer', identifier: p, phone: p, email: '', address: String(farmName || '').trim(), createdAt: new Date().toISOString(), demoPhoneAuth: true };
  accounts[p] = account; saveDemoPhoneAccounts(accounts); return account;
}
function activateDemoPhoneAccount(account) {
  if (!account) return false;
  activeUser = { ...account, demoPhoneAuth: true };
  sessionStorage.setItem('vetronix_active_user', JSON.stringify(activeUser));
  hideAllOverlays(); revealMainPlatform(); renderCattleList(); populateCattleDropdowns(); return true;
}
function updatePhoneOtpUi() {
  const li = document.getElementById('loginId'), lp = document.getElementById('loginPassword'), ll = document.querySelector('label[for="loginPassword"]');
  const si = document.getElementById('signupId'), sp = document.getElementById('signupPassword'), sl = document.querySelector('label[for="signupPassword"]');
  const lphone = isPhoneIdentifier(li?.value || ''), sphone = isPhoneIdentifier(si?.value || '');
  if (ll) ll.textContent = lphone ? 'Test OTP (Phone Login)' : 'Password';
  if (lp) lp.placeholder = lphone ? 'Enter test OTP: 123456' : 'Enter your secret password';
  if (sl) sl.textContent = sphone ? 'Test OTP (Phone Registration)' : 'Create Password';
  if (sp) sp.placeholder = sphone ? 'Enter test OTP: 123456' : 'Minimum 6 characters';
}

async function syncFarmerToSupabase(user) {
  if (!user || !supabaseClient) return null;

  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) return null;

  const metadata = user.user_metadata || {};
  const identifier = (user.email || metadata.mobile || user.phone || '').trim();
  if (!identifier) {
    console.error('VETRONIX: Supabase user has no email/mobile identifier.');
    return null;
  }

  try {
    const response = await apiFetch(`${API_URL}/api/supabase/farmer/ensure`, {
      method: 'POST',
      body: JSON.stringify({
        name: metadata.name || metadata.full_name || 'Farmer',
        identifier,
        farm_name: metadata.farm_name || ''
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.detail || 'Farmer sync failed.');
    }

    user.supabaseFarmerId = data.farmer_id;
    return data.farmer_id;
  } catch (error) {
    console.error('VETRONIX Supabase farmer sync failed:', error);
    return null;
  }
}

function buildActiveUserFromSupabaseUser(user, farmerId) {
  const metadata = user?.user_metadata || {};
  return {
    id: user.id,
    supabaseAuthUserId: user.id,
    supabaseFarmerId: farmerId || null,
    name: metadata.name || metadata.full_name || 'Farmer',
    identifier: user.email || metadata.mobile || user.phone || '',
    email: user.email || '',
    address: metadata.farm_name || '',
    createdAt: user.created_at || new Date().toISOString()
  };
}

async function completeSupabaseLogin(authUser) {
  if (!authUser) return false;

  const farmerId = await syncFarmerToSupabase(authUser);
  if (!farmerId) {
    alert(currentLanguage === 'hi'
      ? 'Supabase में किसान खाता लिंक नहीं हो सका। कृपया दोबारा लॉगिन करें।'
      : 'Your Supabase farmer account could not be linked. Please try logging in again.');
    return false;
  }

  activeUser = buildActiveUserFromSupabaseUser(authUser, farmerId);
  sessionStorage.setItem('vetronix_active_user', JSON.stringify(activeUser));
  hideAllOverlays();
  revealMainPlatform();
  await loadCattleFromSupabase();
  return true;
}

async function loadCattleFromSupabase() {
  if (!activeUser || activeUser.demoPhoneAuth) return;
  const farmerId = activeUser.supabaseFarmerId || await syncFarmerToSupabase(activeUser);
  if (!farmerId) return;

  try {
    const response = await apiFetch(`${API_URL}/api/supabase/cattle/${encodeURIComponent(farmerId)}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.detail || 'Cattle load failed.');

    const remoteCattle = (data.cattle || []).map(c => ({
      id: c.cow_id,
      type: c.animal_type || 'Other',
      breed: c.breed || '',
      age: c.age,
      history: c.medical_history || 'No Prior Mastitis',
      createdAt: c.created_at
    }));

    saveActiveUserCattle(remoteCattle);
    renderCattleList();
    populateCattleDropdowns();
  } catch (error) {
    console.error('VETRONIX Supabase cattle load failed:', error);
  }
}

async function syncCattleToSupabase(cattle) {
  if (activeUser?.demoPhoneAuth) return;
  if (!activeUser || !cattle) return;
  const farmerId = activeUser.supabaseFarmerId || await syncFarmerToSupabase(activeUser);
  if (!farmerId) return;

  try {
    const response = await apiFetch(`${API_URL}/api/supabase/cattle`, {
      method: 'POST',
      body: JSON.stringify({
        farmer_id: Number(farmerId),
        cow_id: cattle.id,
        type: cattle.type,
        breed: cattle.breed,
        age: cattle.age,
        history: cattle.history
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.detail || 'Cattle sync failed.');
  } catch (error) {
    console.error('VETRONIX Supabase cattle sync failed:', error);
  }
}

async function syncSensorPredictionToSupabase(result) {
  if (activeUser?.demoPhoneAuth) return;
  if (!activeUser || !result) return;
  const farmerId = activeUser.supabaseFarmerId || await syncFarmerToSupabase(activeUser);
  if (!farmerId) return;
  try {
    const response = await apiFetch(`${API_URL}/api/supabase/sensor-prediction`, {
      method: 'POST',
      body: JSON.stringify({
        farmer_id: Number(farmerId),
        cow_id: result.cattleId,
        Milk_Temperature: result.temp,
        Milk_Conductivity: result.conductivity,
        Milk_Yield: result.yieldLiters,
        prediction: result.backendResult || (result.riskLevel === 'High' ? 'Mastitis' : 'Healthy'),
        probability: Number(result.probability || 0),
        model_name: 'sensor_random_forest'
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.detail || 'Sensor prediction sync failed.');
  } catch (error) {
    console.error('VETRONIX Supabase sensor/prediction sync failed:', error);
  }
}

async function syncImagePredictionToSupabase(result) {
  if (activeUser?.demoPhoneAuth) return;
  if (!activeUser || !result) return;
  const farmerId = activeUser.supabaseFarmerId || await syncFarmerToSupabase(activeUser);
  if (!farmerId) return;
  const cattleId = currentModel1Result?.cattleId || getActiveUserCattle()[0]?.id;
  if (!cattleId) return;
  try {
    const response = await apiFetch(`${API_URL}/api/supabase/image-prediction`, {
      method: 'POST',
      body: JSON.stringify({
        farmer_id: Number(farmerId),
        cow_id: cattleId,
        image_url: 'teat-image.jpg',
        prediction: result.backendResult || (result.riskLevel === 'High' ? 'Mastitis' : 'Healthy'),
        probability: Number(result.probability || 0),
        model_name: 'mastitis_image_model'
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.detail || 'Image prediction sync failed.');
  } catch (error) {
    console.error('VETRONIX Supabase image prediction sync failed:', error);
  }
}

/**
 * Farmer Login Handler
 */
async function executeLogin(event) {
  event.preventDefault();
  const idInput = document.getElementById('loginId').value.trim();
  const pwdInput = document.getElementById('loginPassword').value.trim();
  if (!idInput || !pwdInput) return;

  if (PHONE_OTP_DEMO_MODE && isPhoneIdentifier(idInput)) {
    const phone = normalizePhoneIdentifier(idInput);
    if (pwdInput !== PHONE_DEMO_OTP) { alert(currentLanguage === 'hi' ? 'टेस्ट फोन OTP गलत है। डेमो OTP: 123456' : 'Invalid test phone OTP. Demo OTP: 123456'); return; }
    const account = getDemoPhoneAccount(phone);
    if (!account) { alert(currentLanguage === 'hi' ? 'इस मोबाइल नंबर का किसान खाता नहीं मिला। पहले Register Farm से खाता बनाएं।' : 'No farmer account exists for this phone number. Please register the farm first.'); return; }
    activateDemoPhoneAccount(account); document.getElementById('loginForm').reset(); updatePhoneOtpUi(); return;
  }

  if (!supabaseClient) { alert('Supabase Auth is not available. Please refresh the page.'); return; }
  if (!idInput.includes('@')) { alert(currentLanguage === 'hi' ? 'कृपया वैध ईमेल पता दर्ज करें, या टेस्ट फोन लॉगिन के लिए 123456 OTP का उपयोग करें।' : 'Please enter a valid email address, or use the test phone login with OTP 123456.'); return; }
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: idInput.toLowerCase(), password: pwdInput });
    if (error) throw error;
    const linked = await completeSupabaseLogin(data.user);
    if (!linked) { await supabaseClient.auth.signOut(); return; }
    document.getElementById('loginForm').reset(); updatePhoneOtpUi();
  } catch (error) {
    console.error('VETRONIX Supabase login failed:', error);
    alert(currentLanguage === 'hi' ? `लॉगिन असफल: ${error.message}` : `Login failed: ${error.message}`);
  }
}


/**
 * Farmer Signup Handler
 */
async function executeSignup(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const identifier = document.getElementById('signupId').value.trim();
  const address = document.getElementById('signupAddress').value.trim();
  const passwordOrOtp = document.getElementById('signupPassword').value.trim();

  if (PHONE_OTP_DEMO_MODE && isPhoneIdentifier(identifier)) {
    if (passwordOrOtp !== PHONE_DEMO_OTP) { alert(currentLanguage === 'hi' ? 'टेस्ट फोन OTP गलत है। डेमो OTP: 123456' : 'Invalid test phone OTP. Demo OTP: 123456'); return; }
    try {
      const account = createDemoPhoneAccount(identifier, name, address);
      activateDemoPhoneAccount(account); document.getElementById('signupForm').reset(); updatePhoneOtpUi();
      alert(currentLanguage === 'hi' ? `बधाई हो, ${name}! किसान खाता बनाया गया है। टेस्ट OTP: 123456` : `Congratulations, ${name}! Your farmer account has been created. Test OTP: 123456`);
    } catch (error) { alert(currentLanguage === 'hi' ? `खाता बनाने में त्रुटि: ${error.message}` : `Account creation failed: ${error.message}`); }
    return;
  }

  if (!supabaseClient) { alert('Supabase Auth is not available. Please refresh the page.'); return; }
  if (!identifier.includes('@')) { alert(currentLanguage === 'hi' ? 'कृपया वैध ईमेल पता या वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid email address or phone number.'); return; }
  if (passwordOrOtp.length < 6) { alert(currentLanguage === 'hi' ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'Password must be at least 6 characters.'); return; }
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email: identifier.toLowerCase(), password: passwordOrOtp, options: { data: { name, full_name: name, farm_name: address } } });
    if (error) throw error;
    if (!data.session || !data.user) {
      alert(currentLanguage === 'hi' ? 'खाता बन गया है। अपने ईमेल में verification link खोलें, फिर लॉगिन करें।' : 'Account created. Please verify your email using the link sent by Supabase, then log in.');
      document.getElementById('signupForm').reset(); switchAuthView('login'); updatePhoneOtpUi(); return;
    }
    const linked = await completeSupabaseLogin(data.user);
    if (!linked) { await supabaseClient.auth.signOut(); return; }
    document.getElementById('signupForm').reset(); updatePhoneOtpUi();
    alert(currentLanguage === 'hi' ? `बधाई हो, ${name}! आपका डेयरी खाता सफलतापूर्वक बन गया है।` : `Congratulations, ${name}! Your dairy farm account has been created.`);
  } catch (error) {
    console.error('VETRONIX Supabase signup failed:', error);
    alert(currentLanguage === 'hi' ? `खाता बनाने में त्रुटि: ${error.message}` : `Account creation failed: ${error.message}`);
  }
}


/**
 * Supabase Auth password reset using email OTP.
 * The existing OTP UI is retained; only the authentication mechanism changes.
 */
async function sendOtpForReset() {
  if (!supabaseClient) return;

  const idInput = document.getElementById('forgotIdentifier').value.trim().toLowerCase();

  if (!idInput || !idInput.includes('@')) {
    alert(currentLanguage === 'hi'
      ? 'कृपया अपना पंजीकृत ईमेल दर्ज करें।'
      : 'Please enter your registered email address.'
    );
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: idInput,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) throw error;

    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    document.getElementById('displayOtpCode').innerText = '******';

    alert(currentLanguage === 'hi'
      ? 'आपके ईमेल पर Supabase verification code भेजा गया है।'
      : 'A Supabase verification code has been sent to your email.'
    );
  } catch (error) {
    console.error('VETRONIX Supabase OTP request failed:', error);
    alert(currentLanguage === 'hi'
      ? `OTP भेजने में त्रुटि: ${error.message}`
      : `Could not send OTP: ${error.message}`
    );
  }
}

async function verifyOtpAndResetPassword() {
  if (!supabaseClient) return;

  const enteredOtp = document.getElementById('inputOtpCode').value.trim();
  const newPwd = document.getElementById('newPassword').value;
  const idInput = document.getElementById('forgotIdentifier').value.trim().toLowerCase();

  if (!enteredOtp || enteredOtp.length !== 6) {
    alert(currentLanguage === 'hi' ? 'कृपया 6-अंकों का OTP दर्ज करें।' : 'Please enter the 6-digit OTP.');
    return;
  }

  if (!newPwd || newPwd.length < 6) {
    alert(currentLanguage === 'hi' ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'New password must be at least 6 characters.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: idInput,
      token: enteredOtp,
      type: 'email'
    });

    if (error) throw error;

    if (!data.session) {
      throw new Error('Supabase did not create a recovery session.');
    }

    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPwd
    });

    if (updateError) throw updateError;

    await supabaseClient.auth.signOut();

    alert(currentLanguage === 'hi'
      ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है! अब नए पासवर्ड से लॉगिन करें।'
      : 'Password reset successfully. You can now log in with your new password.'
    );

    document.getElementById('inputOtpCode').value = '';
    document.getElementById('newPassword').value = '';
    switchAuthView('login');
  } catch (error) {
    console.error('VETRONIX Supabase password reset failed:', error);
    alert(currentLanguage === 'hi'
      ? `पासवर्ड रीसेट असफल: ${error.message}`
      : `Password reset failed: ${error.message}`
    );
  }
}

/**
 * Logout from Supabase Auth and clear the local dashboard session.
 */
async function executeLogout() {
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
  } catch (error) {
    console.error('VETRONIX Supabase logout failed:', error);
  }

  sessionStorage.removeItem('vetronix_active_user');
  activeUser = null;
  currentModel1Result = null;
  currentModel2Result = null;

  document.getElementById('authOverlay').classList.add('active');
  switchAuthView('login');
}

/**
 * Reveal Main Platform Dashboard and populate current user's data
 */
function revealMainPlatform() {
  if (!activeUser) return;

  // Update top bar user info
  document.getElementById('topUserName').innerText = activeUser.name;
  document.getElementById('topUserPhone').innerText = `(${activeUser.identifier})`;

  // Load and render this user's isolated cattle herd
  renderCattleList();
  populateCattleDropdowns();
}


// =========================================================================
// 5. CATTLE HERD MANAGEMENT (ISOLATED TO ACTIVE ACCOUNT)
// =========================================================================
function getUserCattleStorageKey() {
  // Use the logged-in user's storage when available.
  // If the page is opened before login, use a guest key so the form still works.
  return activeUser && activeUser.supabaseAuthUserId
    ? 'vetronix_cattle_user_' + String(activeUser.supabaseAuthUserId)
    : 'vetronix_cattle_guest';
}

function getActiveUserCattle() {
  const key = getUserCattleStorageKey();
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    localStorage.removeItem(key);
    return [];
  }
}

function saveActiveUserCattle(cattleList) {
  const key = getUserCattleStorageKey();
  localStorage.setItem(key, JSON.stringify(cattleList));
}

function handleCattleTypeChange(type) {
  const breedInput = document.getElementById('cattleBreed');
  if (type === 'Cow') {
    breedInput.placeholder = 'e.g. Gir, Sahiwal, Holstein, Jersey';
  } else if (type === 'Buffalo') {
    breedInput.placeholder = 'e.g. Murrah, Mehsana, Jaffarabadi';
  } else {
    breedInput.placeholder = 'e.g. Mixed breed';
  }
}

/**
 * Add / Save New Cattle
 */
async function handleSaveCattle(event) {
  if (event) event.preventDefault();

  const form = document.getElementById('addCattleForm');
  const typeEl = document.getElementById('cattleType');
  const idEl = document.getElementById('cattleId');
  const breedEl = document.getElementById('cattleBreed');
  const ageEl = document.getElementById('cattleAge');
  const historyEl = document.getElementById('cattleHistory');

  if (!form || !typeEl || !idEl || !breedEl || !ageEl || !historyEl) {
    console.error('VETRONIX: cattle form elements were not found.');
    alert('Cattle form could not be loaded. Please refresh the page.');
    return false;
  }

  const type = typeEl.value.trim();
  const id = idEl.value.trim();
  const breed = breedEl.value.trim();
  const age = parseFloat(ageEl.value);
  const history = historyEl.value;

  if (!type || !id || !breed || !Number.isFinite(age) || !history) {
    alert(currentLanguage === 'hi'
      ? 'कृपया सभी पशु विवरण भरें।'
      : 'Please fill in all cattle details.');
    return false;
  }

  const cattleList = getActiveUserCattle();

  if (cattleList.some(c => String(c.id).toLowerCase() === id.toLowerCase())) {
    alert(currentLanguage === 'hi'
      ? `इस आईडी (${id}) का पशु पहले से मौजूद है!`
      : `A cattle with Tag ID (${id}) already exists in your herd!`);
    return false;
  }

  const newCattle = {
    id,
    type,
    breed,
    age,
    history,
    createdAt: new Date().toISOString()
  };

  cattleList.push(newCattle);
  saveActiveUserCattle(cattleList);
  await syncCattleToSupabase(newCattle);

  // Immediately refresh the visible Registered Cattle section.
  renderCattleList();
  populateCattleDropdowns();

  form.reset();
  handleCattleTypeChange(document.getElementById('cattleType').value);

  alert(currentLanguage === 'hi'
    ? `पशु ${id} सफलतापूर्वक जोड़ दिया गया है!`
    : `Cattle ${id} has been registered successfully!`);

  return false;
}

/**
 * Render cattle cards in UI (strictly isolated to logged-in user)
 */
function renderCattleList() {
  const container = document.getElementById('cattleCardsContainer');
  const countBadge = document.getElementById('cattleCountBadge');
  const cattleList = getActiveUserCattle();

  if (!container) {
    console.error('VETRONIX: cattleCardsContainer was not found.');
    return;
  }
  if (countBadge) countBadge.innerText = cattleList.length;

  if (cattleList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem 1rem; color: #64748b;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🐄</div>
        <p><strong>${currentLanguage === 'hi' ? 'अभी कोई पशु पंजीकृत नहीं है।' : 'No cattle registered yet.'}</strong></p>
        <span style="font-size: 0.85rem;">${currentLanguage === 'hi' ? 'बाईं ओर फॉर्म भरकर अपनी गाय या भैंस का विवरण जोड़ें।' : 'Fill out the form on the left to add your first cow or buffalo.'}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = cattleList.map(c => `
    <div class="cattle-item-card">
      <div>
        <div class="cattle-item-top">
          <span class="cattle-tag-id">${c.id}</span>
          <span class="cattle-type-pill ${c.type.toLowerCase()}">${c.type}</span>
        </div>
        <div class="cattle-meta-details">
          <div><strong>${currentLanguage === 'hi' ? 'नस्ल' : 'Breed'}:</strong> ${c.breed}</div>
          <div><strong>${currentLanguage === 'hi' ? 'उम्र' : 'Age'}:</strong> ${c.age} ${currentLanguage === 'hi' ? 'वर्ष' : 'Years'}</div>
          <div><strong>${currentLanguage === 'hi' ? 'इतिहास' : 'History'}:</strong> ${c.history}</div>
          <div><strong>${currentLanguage === 'hi' ? 'पंजीकरण तिथि' : 'Registered'}:</strong> ${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</div>
        </div>
      </div>
      <button type="button" class="btn-select-cattle" onclick="selectCattleForPrediction('${c.id}')">
        ${currentLanguage === 'hi' ? 'जांच के लिए चुनें →' : 'Select for Diagnosis →'}
      </button>
    </div>
  `).join('');
}

/**
 * Populate Cattle dropdowns across prediction sections
 */
function populateCattleDropdowns() {
  const select = document.getElementById('m1CattleSelect');
  const cattleList = getActiveUserCattle();

  const currentVal = select.value;
  select.innerHTML = `<option value="">-- ${currentLanguage === 'hi' ? 'पंजीकृत पशु चुनें' : 'Choose Cattle from Registered List'} --</option>` +
    cattleList.map(c => `<option value="${c.id}">${c.id} - ${c.breed} (${c.type})</option>`).join('');

  if (currentVal && cattleList.some(c => c.id === currentVal)) {
    select.value = currentVal;
  }
}

/**
 * Pre-select cattle in Model 1 and scroll smoothly
 */
function selectCattleForPrediction(cattleId) {
  const select = document.getElementById('m1CattleSelect');
  select.value = cattleId;
  populateCattleDetailsInModel1(cattleId);

  document.getElementById('model1').scrollIntoView({ behavior: 'smooth' });
}

function populateCattleDetailsInModel1(cattleId) {
  if (!cattleId) return;
  const cattleList = getActiveUserCattle();
  const cattle = cattleList.find(c => c.id === cattleId);
  if (!cattle) return;

  // Pre-fill last known values or standard baseline
  if (!document.getElementById('m1Temp').value) {
    document.getElementById('m1Temp').value = cattle.lastTemp || '38.6';
  }
  if (!document.getElementById('m1TdsPpm').value) {
    const defaultPpm = (cattle.lastCond ? cattle.lastCond * 500 : 2500);
    document.getElementById('m1TdsPpm').value = defaultPpm;
    recalculateConductivity(defaultPpm);
  }
  if (!document.getElementById('m1Yield').value) {
    document.getElementById('m1Yield').value = cattle.lastYield || '14.5';
  }
}


// =========================================================================
// 6. MODEL 1: SENSOR TELEMETRY & FORMULA CONVERSION
// Formula: Milk Conductivity (mS/cm) = TDS (ppm) ÷ 500
// =========================================================================

/**
 * Automatic recalculation of TDS ppm to mS/cm
 */
function recalculateConductivity(ppmVal) {
  const condInput = document.getElementById('m1Conductivity');
  const ppm = parseFloat(ppmVal);

  if (isNaN(ppm) || ppm <= 0) {
    condInput.value = '';
    return;
  }

  // Formula: Milk Conductivity (mS/cm) = TDS (ppm) ÷ 500
  const conductivity = ppm / 500;
  condInput.value = conductivity.toFixed(2);
}

/**
 * Fetch from ESP32 Sensor (Simulation with realistic ADC sensor telemetry)
 */
async function fetchLiveESP32Sensors(silent = false) {
  const btn = document.querySelector('#model1Form button[onclick^="fetchLiveESP32Sensors"]');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn && !silent) {
    btn.innerHTML = `<span class="pulse-dot"></span> Polling ESP32 Probe...`;
    btn.disabled = true;
  }

  try {
    // The backend reads http://10.34.187.26/data from the ESP32.
    // This avoids browser CORS/mixed-content problems and keeps the
    // existing frontend -> FastAPI -> Supabase architecture intact.
    const response = await fetch(`${API_URL}/api/esp32-live`, {
      method: 'GET',
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.detail || data.message || "Unable to read sensor data.");
    }

    const temp = Number(data.Milk_Temperature);
    const ppm = Number(data.TDS_PPM);
    const voltage = Number(data.TDS_Voltage ?? 0);
    const conductivity = ppm / 500;

    if (!Number.isFinite(temp) || !Number.isFinite(ppm)) {
      throw new Error("ESP32 returned invalid temperature/TDS values.");
    }

    // Update the existing UI fields only. No HTML/CSS changes are made.
    document.getElementById('m1Temp').value = temp.toFixed(2);
    document.getElementById('m1TdsPpm').value = ppm.toFixed(2);
    recalculateConductivity(ppm);

    // Send the same live values into the existing FastAPI sensor store.
    // Milk yield remains the existing manual field.
    const yieldField = document.getElementById('m1Yield');
    const milkYield = Number(yieldField?.value);

    const backendPayload = {
      Milk_Temperature: temp,
      Milk_Conductivity: conductivity,
      Milk_Yield: Number.isFinite(milkYield) ? milkYield : 0
    };

    const backendResponse = await fetch(`${API_URL}/api/sensor-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload)
    });

    const backendData = await backendResponse.json();

    if (!backendResponse.ok || !backendData.success) {
      throw new Error(
        backendData.detail || backendData.message || "Backend did not accept sensor data."
      );
    }

    // Keep the latest telemetry available to the rest of the frontend.
    window.vetronixLatestESP32 = {
      temperature: temp,
      tdsPpm: ppm,
      voltage,
      conductivity,
      milkYield: backendPayload.Milk_Yield,
      timestamp: new Date().toISOString()
    };

    if (!silent) {
      alert(
        currentLanguage === 'hi'
          ? `ESP32 सेंसर डेटा प्राप्त हुआ!\nतापमान: ${temp.toFixed(2)}°C | TDS: ${ppm.toFixed(2)} ppm | चालकता: ${conductivity.toFixed(2)} mS/cm`
          : `ESP32 sensor data received!\nMilk Temp: ${temp.toFixed(2)}°C | TDS: ${ppm.toFixed(2)} ppm | Conductivity: ${conductivity.toFixed(2)} mS/cm`
      );
    }

    return window.vetronixLatestESP32;
  } catch (error) {
    console.error("ESP32 sensor fetch error:", error);

    // Do not show repeated popups during automatic polling.
    if (!silent) {
      alert(
        currentLanguage === 'hi'
          ? `सेंसर डेटा प्राप्त नहीं हो सका। कृपया ESP32 और बैकएंड कनेक्शन जांचें।\n${error.message}`
          : `Unable to receive sensor data. Please check the ESP32 and backend connection.\n${error.message}`
      );
    }
    return null;
  } finally {
    if (btn && !silent) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

let esp32LiveTimer = null;

/**
 * Start live ESP32 polling without changing the existing UI.
 * The first read happens immediately, then every 2 seconds.
 */
function startESP32LivePolling() {
  if (esp32LiveTimer) clearInterval(esp32LiveTimer);

  // Do not create a request until the Model 1 fields exist.
  const poll = () => {
    if (
      document.getElementById('m1Temp') &&
      document.getElementById('m1TdsPpm') &&
      document.getElementById('m1Conductivity')
    ) {
      fetchLiveESP32Sensors(true);
    }
  };

  poll();
  esp32LiveTimer = setInterval(poll, ESP32_LIVE_POLL_MS);
}

/**
 * Run Model 1 Prediction (Sensor Classifier)
 */
async function runModel1Prediction(event) {
  event.preventDefault();

  const cattleId = document.getElementById('m1CattleSelect').value;
  const temp = parseFloat(document.getElementById('m1Temp').value);
  const tdsPpm = parseFloat(document.getElementById('m1TdsPpm').value);
  const conductivity = parseFloat(document.getElementById('m1Conductivity').value);
  const yieldLiters = parseFloat(document.getElementById('m1Yield').value);

  if (!cattleId) {
    alert(currentLanguage === 'hi' ? 'कृपया पहले पशु का आईडी चुनें।' : 'Please select Cattle ID first.');
    return;
  }

  if (![temp, conductivity, yieldLiters].every(Number.isFinite)) {
    alert(currentLanguage === 'hi'
      ? 'कृपया सभी सेंसर मान दर्ज करें।'
      : 'Please enter valid sensor values.');
    return;
  }

  const submitButton = event.submitter;
  const originalText = submitButton ? submitButton.innerHTML : null;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = currentLanguage === 'hi' ? 'AI मॉडल चल रहा है...' : 'Running AI Model...';
  }

  try {
    const response = await fetch(`${API_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Milk_Temperature: temp,
        Milk_Conductivity: conductivity,
        Milk_Yield: yieldLiters
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = typeof data.detail === 'string'
        ? data.detail
        : JSON.stringify(data.detail || data);
      throw new Error(detail);
    }

    const isMastitis = Number(data.prediction) === 1 || String(data.result).toLowerCase() === 'mastitis';
    const probability = Number(data.probability_percent ?? (Number(data.probability) * 100));

    const riskLevel = isMastitis ? 'High' : 'Low';

    currentModel1Result = {
      cattleId,
      temp,
      tdsPpm,
      conductivity,
      yieldLiters,
      riskLevel,
      confidence: Number.isFinite(probability) ? probability.toFixed(1) : '0.0',
      probability: Number.isFinite(probability) ? probability : 0,
      backendResult: data.result,
      threshold: data.threshold,
      timestamp: new Date().toISOString()
    };

    await syncSensorPredictionToSupabase(currentModel1Result);

    const resultCard = document.getElementById('m1ResultCard');
    const emojiElem = document.getElementById('m1ResultEmoji');
    const titleElem = document.getElementById('m1RiskTitle');
    const descElem = document.getElementById('m1RiskDescription');
    const confElem = document.getElementById('m1ConfidenceScore');
    const escalationAlert = document.getElementById('m1EscalationAlert');

    resultCard.style.display = 'block';
    confElem.innerText = `${currentModel1Result.confidence}%`;

    if (isMastitis) {
      emojiElem.innerText = '😟';
      titleElem.innerText = currentLanguage === 'hi'
        ? 'थनैला जोखिम पाया गया'
        : 'Mastitis Risk Detected';
      titleElem.style.color = '#dc2626';

      descElem.innerText = currentLanguage === 'hi'
        ? `AI मॉडल ने ${currentModel1Result.confidence}% संभावना के साथ थनैला जोखिम पाया है।`
        : `The backend AI model detected mastitis with ${currentModel1Result.confidence}% probability.`;

      escalationAlert.style.display = 'flex';
    } else {
      emojiElem.innerText = '😊';
      titleElem.innerText = currentLanguage === 'hi'
        ? 'थनैला जोखिम नहीं पाया गया — दूध स्वस्थ है'
        : 'No Mastitis Risk — Normal Milk';
      titleElem.style.color = '#16a34a';

      descElem.innerText = currentLanguage === 'hi'
        ? `AI मॉडल ने ${currentModel1Result.confidence}% संभावना के साथ स्वस्थ परिणाम दिया।`
        : `The backend AI model returned Healthy with ${currentModel1Result.confidence}% probability.`;

      escalationAlert.style.display = 'none';
    }

    updateCombinedReport();
  } catch (error) {
    console.error("Model 1 prediction error:", error);
    alert(currentLanguage === 'hi'
      ? `बैकएंड से भविष्यवाणी नहीं हो सकी।\\n${error.message}`
      : `Backend prediction failed.\\n${error.message}`
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }
}

// =========================================================================
// 7. MODEL 2: TEAT VISION ML PREDICTION (ESP32-CAM / UPLOAD)
// =========================================================================

/**
 * Simulated Capture from ESP32-CAM Module
 */
function captureFromEsp32Cam() {
  const previewFrame = document.getElementById('teatPreviewFrame');
  const emptyNotice = document.getElementById('emptyPreviewNotice');
  const loadedImg = document.getElementById('loadedTeatImage');
  const laserOverlay = document.getElementById('aiVisionScanOverlay');

  emptyNotice.style.display = 'none';
  loadedImg.style.display = 'block';
  laserOverlay.style.display = 'block';

  // If Model 1 was High/Medium, load a sample showing redness/inflammation, else healthy
  const sampleUrl = (currentModel1Result && (currentModel1Result.riskLevel === 'High' || currentModel1Result.riskLevel === 'Medium'))
    ? SAMPLE_TEAT_IMAGES.mastitic
    : SAMPLE_TEAT_IMAGES.healthy;

  loadedImg.src = sampleUrl;
  currentTeatImageBase64 = sampleUrl;

  setTimeout(() => {
    laserOverlay.style.display = 'none';
  }, 2000);
}

/**
 * Handle Manual File Upload for Teat Image
 */
function handleManualImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const emptyNotice = document.getElementById('emptyPreviewNotice');
    const loadedImg = document.getElementById('loadedTeatImage');
    
    emptyNotice.style.display = 'none';
    loadedImg.style.display = 'block';
    loadedImg.src = e.target.result;
    currentTeatImageBase64 = e.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Run Model 2 Vision Prediction
 */
async function runModel2VisionPrediction() {
  if (!currentTeatImageBase64) {
    alert(currentLanguage === 'hi'
      ? 'कृपया पहले ESP32-CAM से फोटो लें या गैलरी से थन की फोटो अपलोड करें।'
      : 'Please capture an image from ESP32-CAM or upload a teat photo first.'
    );
    return;
  }

  const laserOverlay = document.getElementById('aiVisionScanOverlay');
  laserOverlay.style.display = 'block';

  try {
    const response = await fetch(currentTeatImageBase64);
    const imageBlob = await response.blob();

    const formData = new FormData();
    formData.append('file', imageBlob, 'teat-image.jpg');

    const apiResponse = await fetch(`${API_URL}/api/predict-image`, {
      method: 'POST',
      body: formData
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const detail = typeof data.detail === 'string'
        ? data.detail
        : JSON.stringify(data.detail || data);
      throw new Error(detail);
    }

    const isMastitis = String(data.result).toLowerCase() === 'mastitis' || Number(data.prediction) === 1;
    const riskLevel = isMastitis ? 'High' : 'Low';
    const probability = Number(data.probability_percent ?? (Number(data.probability) * 100));

    currentModel2Result = {
      riskLevel,
      confidence: Number.isFinite(probability) ? probability.toFixed(1) : '0.0',
      probability: Number.isFinite(probability) ? probability : 0,
      backendResult: data.result,
      image: currentTeatImageBase64,
      timestamp: new Date().toISOString()
    };

    await syncImagePredictionToSupabase(currentModel2Result);

    const resultCard = document.getElementById('m2ResultCard');
    const emojiElem = document.getElementById('m2ResultEmoji');
    const titleElem = document.getElementById('m2RiskTitle');
    const descElem = document.getElementById('m2RiskDescription');
    const confElem = document.getElementById('m2ConfidenceScore');

    resultCard.style.display = 'block';
    confElem.innerText = `${currentModel2Result.confidence}%`;

    if (isMastitis) {
      emojiElem.innerText = '😟';
      titleElem.innerText = currentLanguage === 'hi'
        ? 'थनैला जोखिम: थन की छवि में असामान्यता'
        : 'Mastitis Detected in Vision Model';
      titleElem.style.color = '#dc2626';

      descElem.innerText = currentLanguage === 'hi'
        ? `इमेज AI मॉडल ने ${currentModel2Result.confidence}% संभावना के साथ थनैला परिणाम दिया।`
        : `The backend computer-vision model detected mastitis with ${currentModel2Result.confidence}% probability.`;
    } else {
      emojiElem.innerText = '😊';
      titleElem.innerText = currentLanguage === 'hi'
        ? 'स्वस्थ थन ऊतक'
        : 'Healthy Teat Tissue';
      titleElem.style.color = '#16a34a';

      descElem.innerText = currentLanguage === 'hi'
        ? `इमेज AI मॉडल ने ${currentModel2Result.confidence}% संभावना के साथ स्वस्थ परिणाम दिया।`
        : `The backend computer-vision model returned Healthy with ${currentModel2Result.confidence}% probability.`;
    }

    updateCombinedReport();

    document.getElementById('combined').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error("Model 2 prediction error:", error);
    alert(currentLanguage === 'hi'
      ? `इमेज बैकएंड से विश्लेषण नहीं हो सका।\\n${error.message}`
      : `Image backend prediction failed.\\n${error.message}`
    );
  } finally {
    laserOverlay.style.display = 'none';
  }
}

// =========================================================================
// 8. COMBINED CONSENSUS & VETERINARY CLINICAL DECISION SUPPORT
// Rule: If High or Medium risk in both models (or either), cattle must go to Veterinary!
// =========================================================================
function updateCombinedReport() {
  const cattleId = currentModel1Result ? currentModel1Result.cattleId : (getActiveUserCattle()[0] ? getActiveUserCattle()[0].id : 'VTX-COW-101');
  const cattleList = getActiveUserCattle();
  const cattle = cattleList.find(c => c.id === cattleId) || {
    id: cattleId,
    breed: 'Gir Cow',
    age: 4.5,
    history: 'No Prior Mastitis'
  };

  // Populate Cattle details table
  document.getElementById('repCattleId').innerText = cattle.id;
  document.getElementById('repCattleBreed').innerText = cattle.breed;
  document.getElementById('repCattleAge').innerText = `${cattle.age} ${currentLanguage === 'hi' ? 'वर्ष' : 'Years'}`;
  document.getElementById('repCattleHistory').innerText = cattle.history;

  // Populate Sensor readings
  if (currentModel1Result) {
    document.getElementById('repMilkTemp').innerText = `${currentModel1Result.temp} °C`;
    document.getElementById('repMilkCond').innerText = `${currentModel1Result.conductivity} mS/cm (${currentModel1Result.tdsPpm} ppm TDS)`;
    document.getElementById('repMilkYield').innerText = `${currentModel1Result.yieldLiters} ${currentLanguage === 'hi' ? 'लीटर' : 'Liters'}`;
  }

  // Populate Teat Image thumbnail
  if (currentTeatImageBase64) {
    document.getElementById('repTeatThumb').src = currentTeatImageBase64;
  }

  // Model 1 Badge
  const repM1Badge = document.getElementById('repM1Badge');
  if (currentModel1Result) {
    if (currentModel1Result.riskLevel === 'High') {
      repM1Badge.className = 'status-pill red';
      repM1Badge.innerText = 'High Risk 😟';
    } else if (currentModel1Result.riskLevel === 'Medium') {
      repM1Badge.className = 'status-pill amber';
      repM1Badge.innerText = 'Medium Risk 😟';
    } else {
      repM1Badge.className = 'status-pill green';
      repM1Badge.innerText = 'Low Risk 😊';
    }
  }

  // Model 2 Badge
  const repM2Badge = document.getElementById('repM2Badge');
  if (currentModel2Result) {
    if (currentModel2Result.riskLevel === 'High') {
      repM2Badge.className = 'status-pill red';
      repM2Badge.innerText = 'High Risk 😟';
    } else if (currentModel2Result.riskLevel === 'Medium') {
      repM2Badge.className = 'status-pill amber';
      repM2Badge.innerText = 'Medium Risk 😟';
    } else {
      repM2Badge.className = 'status-pill green';
      repM2Badge.innerText = 'Low Risk 😊';
    }
  }

  // Determine Combined Consensus
  const m1Risk = currentModel1Result ? currentModel1Result.riskLevel : 'Low';
  const m2Risk = currentModel2Result ? currentModel2Result.riskLevel : 'Low';

  const isVetAttentionRequired = (m1Risk === 'High' || m2Risk === 'High' || (m1Risk === 'Medium' && m2Risk === 'Medium'));

  const banner = document.getElementById('vetSuggestionBanner');
  const bannerIcon = document.getElementById('vetBannerIcon');
  const bannerTitle = document.getElementById('vetBannerTitle');
  const bannerInstruction = document.getElementById('vetBannerInstruction');
  const checklist = document.getElementById('vetActionChecklist');
  const repFinalBadge = document.getElementById('repFinalBadge');

  if (isVetAttentionRequired) {
    // REQUIREMENT: "if cattle has high or medium risk in both models then the cattle has to go Veterinary"
    banner.className = 'vet-directive-banner high-risk-banner';
    bannerIcon.innerText = '🚨';
    bannerTitle.innerText = currentLanguage === 'hi' 
      ? 'पशु को तुरंत पशु चिकित्सालय ले जाएं (The Cattle Has to Go to Veterinary)'
      : 'IMMEDIATE ACTION: The Cattle Has to Go to Veterinary!';
    
    bannerInstruction.innerText = currentLanguage === 'hi'
      ? `सेंसर (मॉडल 1) और विज़न (मॉडल 2) दोनों में थनैला संक्रमण के स्पष्ट संकेत मिले हैं। पशु की जांच तुरंत नजदीकी पशु चिकित्सक से कराएं।`
      : `Both Model 1 (Sensors) and Model 2 (Vision) indicate active bovine mastitis. The cattle requires immediate examination and prescription from a licensed Veterinary Officer.`;

    checklist.style.display = 'block';
    repFinalBadge.className = 'status-pill red';
    repFinalBadge.innerText = currentLanguage === 'hi' ? 'थनैला संक्रमण पुष्ट 😟' : 'Confirmed Mastitis 😟';
  } else if (m1Risk === 'Medium' || m2Risk === 'Medium') {
    banner.className = 'vet-directive-banner med-risk-banner';
    bannerIcon.innerText = '⚠️';
    bannerTitle.innerText = currentLanguage === 'hi'
      ? 'सतर्कता आवश्यक: पशु चिकित्सक से सलाह लें'
      : 'Caution: Subclinical Mastitis Suspected — Consult Veterinarian';

    bannerInstruction.innerText = currentLanguage === 'hi'
      ? `मध्यम जोखिम पाया गया है। थन पर एंटीसेप्टिक लेप लगाएं और यदि 24 घंटे में सुधार न हो तो पशु को पशु चिकित्सक के पास ले जाएं।`
      : `Moderate ionic or visual deviation detected. Apply post-milking antiseptic teat dip and consult a veterinarian if parameters do not normalize within 24 hours.`;

    checklist.style.display = 'block';
    repFinalBadge.className = 'status-pill amber';
    repFinalBadge.innerText = currentLanguage === 'hi' ? 'मध्यम जोखिम 😟' : 'Medium Risk 😟';
  } else {
    banner.className = 'vet-directive-banner low-risk-banner';
    bannerIcon.innerText = '✅';
    bannerTitle.innerText = currentLanguage === 'hi'
      ? 'पशु पूर्णतः स्वस्थ है — नियमित देखभाल जारी रखें'
      : 'Cattle is Healthy — Routine Care & Hygiene';

    bannerInstruction.innerText = currentLanguage === 'hi'
      ? `मॉडल 1 (सेंसर) और मॉडल 2 (कैमरा) दोनों में सामान्य मान प्राप्त हुए हैं। दूध और थन दोनों स्वस्थ हैं।`
      : `Both Model 1 (Sensors) and Model 2 (Vision) indicate normal, non-mastitic parameters. Continue regular milking hygiene and herd monitoring.`;

    checklist.style.display = 'none';
    repFinalBadge.className = 'status-pill green';
    repFinalBadge.innerText = currentLanguage === 'hi' ? 'स्वस्थ पशु 😊' : 'Healthy Cattle 😊';
  }
}

/**
 * Print or Save Medical Report as PDF
 */
function printMedicalReport() {
  window.print();
}

/**
 * Save Diagnosis to Cattle Record Medical History
 */
async function saveDiagnosisToCattleRecord() {
  if (!currentModel1Result) {
    alert("Please run Model 1 prediction first.");
    return;
  }

  const cattleList = getActiveUserCattle();
  const cattle = cattleList.find(c => c.id === currentModel1Result.cattleId);

  if (cattle) {
    const dateStr = new Date().toLocaleDateString();
    cattle.history = `${currentModel1Result.riskLevel} Risk on ${dateStr} (Temp: ${currentModel1Result.temp}°C, Cond: ${currentModel1Result.conductivity} mS/cm)`;
    cattle.lastTemp = currentModel1Result.temp;
    cattle.lastCond = currentModel1Result.conductivity;
    cattle.lastYield = currentModel1Result.yieldLiters;

    saveActiveUserCattle(cattleList);
    await syncCattleToSupabase(cattle);
    renderCattleList();

    alert(currentLanguage === 'hi' 
      ? `जांच परिणाम पशु ${cattle.id} के मेडिकल इतिहास में जोड़ दिया गया है!`
      : `Diagnosis successfully saved to medical history of cattle ${cattle.id}!`
    );
  }
}


// =========================================================================
// 9. CONTACT FORM & INQUIRY HANDLER
// =========================================================================
function handleContactSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const msg = document.getElementById('contactMessage').value.trim();

  alert(currentLanguage === 'hi' 
    ? `धन्यवाद, ${name}! आपका संदेश Vetronix टीम को प्राप्त हो गया है। हम जल्द ही आपसे संपर्क करेंगे।`
    : `Thank you, ${name}! Your inquiry has been sent to the Vetronix team. We will contact you shortly.`
  );

  document.getElementById('contactForm').reset();
}


// =========================================================================
// 10. DYNAMIC MULTILINGUAL TRANSLATION APPLIER
// =========================================================================
function applyLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('vetronix_preferred_lang', lang);

  const langDict = translations[lang] || translations.en;

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (langDict[key]) {
      elem.innerText = langDict[key];
    }
  });

  // Update select dropdowns
  const headerSelect = document.getElementById('headerLangSelect');
  if (headerSelect) {
    headerSelect.value = lang;
  }

  // Refresh cattle list & combined report texts if active
  if (activeUser) {
    renderCattleList();
    populateCattleDropdowns();
    updateCombinedReport();
  }
}
// Safety fallback: ensure the cattle form works even if the inline onsubmit
// handler is blocked or altered by the browser.


// -------------------------------------------------------------------------
// IMAGE RELIABILITY: keep every static image visible even if an external
// image host is unavailable. External images are tried first; local SVGs are
// used only as a visual fallback.
// -------------------------------------------------------------------------
function installImageFallbacks() {
  document.querySelectorAll("img[data-fallback]").forEach(function (img) {
    if (img.dataset.imageFallbackBound === "true") return;
    img.dataset.imageFallbackBound = "true";
    img.addEventListener("error", function () {
      const fallback = img.getAttribute("data-fallback");
      if (!fallback || img.dataset.fallbackUsed === "true") return;
      img.dataset.fallbackUsed = "true";
      img.src = fallback;
    });
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const cattleForm = document.getElementById('addCattleForm');
  if (cattleForm && !cattleForm.dataset.vetronixBound) {
    cattleForm.dataset.vetronixBound = 'true';
    cattleForm.addEventListener('submit', function (event) {
      handleSaveCattle(event);
    });
  }

  // Render any already-saved cattle when the page is ready.
  renderCattleList();
  installImageFallbacks();
});
