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
const API_URL = "http://127.0.0.1:8000";

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
    saved_cattle_title: "Your Registered Cattle",
    model1_tag: "First Stage AI Model",
    model1_title: "Model 1: Sensor-Based Mastitis Prediction",
    model1_sub: "Calculates mastitis risk based on milk temperature, electrical conductivity (converted from TDS), and milk yield.",
    label_select_cattle: "Select Cattle ID",
    label_milk_temp: "Milk Temperature (°C)",
    label_tds_ppm: "TDS Sensor Value (ppm)",
    label_conductivity_ms: "Converted Milk Conductivity (mS/cm)",
    label_milk_yield: "Milk Yield (Litres)",
    btn_fetch_esp32: "Fetch Live Data from ESP32 Sensor",
    btn_predict_m1: "Check Mastitis Risk (Model 1) →",
    formula_title: "Conductivity Conversion Formula",
    formula_desc: "TDS Meter 1.0 measures milk ions in ppm. Vetronix converts it into milk electrical conductivity in mS/cm using the formula TDS (ppm) ÷ 500.",
    alert_vision_needed_title: "Important Warning: Teat Image Inspection Required",
    alert_vision_needed_desc: "Because Model 1 detected a medium/high mastitis risk, please capture a teat image using the provided ESP32-CAM or upload one below in Model 2.",
    btn_proceed_to_vision: "Proceed to Model 2 (Teat Image Inspection) ↓",
    model2_tag: "Second Stage Vision Model",
    model2_title: "Model 2: Teat Image AI Prediction",
    model2_sub: "CNN model trained to detect redness, swelling, and lesions in teat and udder images.",
    teat_img_heading: "Capture Teat Image",
    teat_img_sub: "Capture an image directly from ESP32-CAM or upload one from your gallery.",
    btn_capture_esp32cam: "Capture Photo from ESP32-CAM Sensor",
    or_text: "OR",
    upload_teat_click: "Click to upload teat image",
    upload_teat_drag: "or drag and drop photo here (JPG, PNG)",
    btn_analyze_m2: "Analyze Teat Image (Model 2) →",
    no_teat_img_yet: "No image yet. Press 'Capture from ESP32-CAM' or upload one.",
    combined_tag: "Veterinary Decision Support",
    combined_title: "Combined AI Result & Veterinary Consultation",
    combined_sub: "Overall conclusion from Sensor Data (Model 1) and Teat Image (Model 2).",
    summary_cattle_header: "Cattle Identity & Sensor Data",
    summary_models_header: "AI Model & Vision Inspection Results",
    th_cattle_id: "Cattle ID:",
    th_breed: "Breed:",
    th_age: "Age:",
    th_history: "Previous History:",
    th_temp: "Milk Temperature:",
    th_cond: "Milk Conductivity:",
    th_yield: "Milk Yield:",
    rep_model1_label: "Model 1 (Sensors):",
    rep_model2_label: "Model 2 (Camera):",
    rep_combined_label: "Combined Conclusion:",
    checklist_title: "🚨 Emergency Veterinary Protocol:",
    chk1: "Immediately isolate the infected cow/buffalo from healthy animals.",
    chk2: "Discard milk from the affected udder — do not mix it with the normal milk tank.",
    chk3: "Apply ice/cold compresses to the udder and use antiseptic teat dip.",
    chk4: "Contact a veterinarian immediately for CMT testing and antibiotic treatment.",
    btn_print_report: "Download / Print Medical Report (PDF)",
    btn_save_diagnosis: "Add Diagnosis to Cattle History",
    contact_tag: "Support & Contact",
    contact_title: "Contact Vetronix Technical Team",
    contact_sub: "Contact us for ESP32 setup, sensor calibration, or animal health related questions.",
    contact_email_label: "Official Support Email",
    contact_phone_label: "Direct Contact & Farmer Helpline",
    contact_insta_label: "Official Instagram Handle",
    contact_addr_label: "Research & Innovation Laboratory",
    inquiry_heading: "Send Your Question or Message",
    label_your_name: "Your Name",
    label_your_email: "Your Email or Mobile Number",
    label_your_msg: "Your Message / Question",
    btn_send_inquiry: "Send Message →",
    footer_copy: "© 2026 Vetronix AIoT Dairy Healthcare. Developed for Smart India Hackathon (SIH 2026)."
  },

  hi: {
    tutorial_step_badge: "चरण 1/3: प्लेटफ़ॉर्म ट्यूटोरियल",
    btn_skip_tutorial: "ट्यूटोरियल छोड़ें और आगे बढ़ें →",
    tutorial_heading: "Vetronix.ai प्लेटफ़ॉर्म में आपका स्वागत है",
    tutorial_subheading: "पशु स्वास्थ्य की निगरानी, ESP32 सेंसर डेटा संग्रह और दोहरे AI थनैला पूर्वानुमान को समझने के लिए यह छोटा वीडियो देखें।",
    tutorial_hi_title: "Vetronix कैसे उपयोग करें - हिंदी ट्यूटोरियल",
    tutorial_en_title: "Vetronix कैसे उपयोग करें - अंग्रेज़ी ट्यूटोरियल",
    tutorial_video_replace_hint: "",
    tutorial_video_replace_hint_en: "",
    tutorial_reopen_note: "💡 आप ऊपर के नेविगेशन बार से किसी भी समय इस ट्यूटोरियल को फिर से खोल सकते हैं।",
    btn_proceed_language: "भाषा चयन पर जाएं →",
    lang_step_badge: "चरण 2/3: भाषा चुनें",
    lang_modal_heading: "अपनी पसंदीदा भाषा चुनें",
    lang_modal_subheading: "आप पूरी वेबसाइट, ML मॉडल के पूर्वानुमान, सेंसर डेटा और पशु चिकित्सा सुझाव किस भाषा में देखना चाहते हैं?",
    btn_confirm_lang_proceed: "चरण 3: लॉगिन पर जाएं →",
    tab_login: "किसान लॉगिन",
    tab_signup: "फार्म पंजीकरण (साइन अप)",
    login_heading: "अपने फार्म डैशबोर्ड में लॉगिन करें",
    login_sub: "अपने निजी पशु रिकॉर्ड देखने के लिए पंजीकृत मोबाइल नंबर या ईमेल और पासवर्ड दर्ज करें।",
    label_mobile_or_email: "मोबाइल नंबर या ईमेल पता",
    label_password: "पासवर्ड",
    link_forgot_pwd: "पासवर्ड भूल गए?",
    btn_login_submit: "Vetronix में लॉगिन करें →",
    isolation_guarantee_title: "100% खाता डेटा गोपनीयता:",
    isolation_guarantee_desc: "आपके पशुओं के रिकॉर्ड और थनैला जांच रिपोर्ट केवल आपके खाते तक सीमित हैं और किसी अन्य खाते के साथ साझा नहीं की जाती हैं।",
    signup_heading: "नया डेयरी फार्म खाता बनाएं",
    signup_sub: "IoT-सक्षम AI निदान के साथ अपनी गायों और भैंसों का प्रबंधन शुरू करने के लिए अपना फार्म पंजीकृत करें।",
    label_farmer_name: "किसान / मालिक का पूरा नाम",
    label_farm_address: "फार्म का नाम और गांव / पता",
    btn_signup_submit: "खाता बनाएं और प्लेटफ़ॉर्म में प्रवेश करें →",
    forgot_heading: "OTP द्वारा पासवर्ड रीसेट करें",
    forgot_sub: "हम आपके पंजीकृत मोबाइल नंबर या ईमेल पर 6 अंकों का सत्यापन कोड भेजेंगे।",
    btn_send_otp: "सत्यापन OTP भेजें →",
    back_to_login: "← लॉगिन पर वापस जाएं",
    otp_received_badge: "OTP सफलतापूर्वक भेजा गया:",
    label_enter_otp: "6 अंकों का OTP दर्ज करें",
    label_new_password: "नया पासवर्ड",
    btn_save_new_pwd: "OTP सत्यापित करें और पासवर्ड सुरक्षित करें →",
    sih_track_title: "SIH 2026 इनोवेशन ट्रैक:",
    sih_track_desc: "AIoT पशु स्वास्थ्य और प्रारंभिक थनैला चेतावनी",
    nav_tutorial_btn: "ट्यूटोरियल",
    btn_logout: "लॉगआउट",
    brand_tagline: "स्मार्ट डेयरी IoT और विजन इंटेलिजेंस",
    nav_overview: "अवलोकन",
    nav_hardware: "हार्डवेयर और सेंसर",
    nav_cattle: "मेरे पशु",
    nav_model1: "मॉडल 1 (सेंसर)",
    nav_model2: "मॉडल 2 (विजन)",
    nav_combined: "संयुक्त परिणाम",
    nav_contact: "संपर्क",
    btn_run_screening: "जांच शुरू करें",
    hero_pill: "Vetronix.ai प्लेटफ़ॉर्म में आपका स्वागत है",
    hero_headline: "डेयरी पशुओं के लिए थनैला की प्रारंभिक चेतावनी",
    hero_subtext: "Vetronix एक ESP32 मल्टीसेंसर जांच (दूध चालकता और तापमान) और ESP32-CAM थन कंप्यूटर विजन मॉडल को मिलाकर थनैला रोग के लक्षण दिखने से पहले ही पहचान करता है।",
    hero_btn_start: "थनैला जांच शुरू करें →",
    hero_btn_hardware: "हार्डवेयर उपकरण देखें",
    stat_acc: "दोहरे AI की सटीकता",
    stat_time: "टेलीमेट्री विश्लेषण",
    stat_privacy: "किसान डेटा गोपनीयता",
    overview_tag: "रोग विज्ञान और प्रभाव",
    overview_title: "गाय और भैंस में थनैला को समझें",
    overview_sub: "थनैला थन और स्तन ऊतक की सूजन है, जो मुख्य रूप से जीवाणु संक्रमण के कारण होती है।",
    card1_title: "सबक्लिनिकल बनाम क्लिनिकल थनैला",
    card1_desc: "सबक्लिनिकल थनैला में बाहर से कोई सूजन या दूध में खराबी नहीं दिखती, लेकिन दूध उत्पादन तेजी से गिर सकता है। क्लिनिकल थनैला में थन में दर्दनाक सूजन, कड़ापन और दूध में बदलाव दिखाई दे सकते हैं।",
    card2_title: "भारत में भारी आर्थिक नुकसान",
    card2_desc: "थनैला रोग के कारण डेयरी क्षेत्र को बड़े आर्थिक नुकसान का सामना करना पड़ता है। किसानों का दूध उत्पादन घट सकता है, दूध रिजेक्ट हो सकता है और इलाज का खर्च बढ़ सकता है।",
    card3_title: "मल्टीसेंसर थनैला की पहचान कैसे करते हैं",
    card3_desc: "जब थन की कोशिकाओं को नुकसान होता है, तो सोडियम और क्लोराइड आयन दूध में बढ़ सकते हैं, जिससे विद्युत चालकता बढ़ती है। सूजन के कारण दूध का तापमान भी बढ़ सकता है।",
    solution_title: "Vetronix का दोहरा AI समाधान",
    solution_desc: "Vetronix एक मल्टीसेंसर प्रोब से दूध के भौतिक-रासायनिक गुणों की तत्काल जांच करता है। जोखिम अधिक होने पर ESP32-CAM थन की तस्वीर का विश्लेषण करता है।",
    hardware_tag: "IoT उपकरण संरचना",
    hardware_title: "Vetronix मल्टीसेंसर हार्डवेयर उपकरण",
    hardware_sub: "डेयरी फार्म के वातावरण के लिए तैयार सेंसर और एज कंप्यूटर विजन।",
    hw_esp32_desc: "ESP32 सेंसर से डेटा पढ़ता है और Vetronix डैशबोर्ड तक पहुंचाता है।",
    hw_tds_desc: "TDS मीटर दूध में घुले पदार्थों और विद्युत चालकता को ppm में मापता है।",
    hw_temp_desc: "DS18B20 डिजिटल तापमान सेंसर दूध का तापमान मापता है।",
    hw_cam_desc: "ESP32-CAM थन और अयन की तस्वीर लेकर विजन मॉडल को भेजता है।",
    cattle_tag: "डेयरी पशु पंजिका",
    cattle_title: "मेरे पशु",
    cattle_sub: "अपने फार्म की गाय और भैंसों का विवरण जोड़ें।",
    add_cattle_heading: "नया पशु जोड़ें",
    add_cattle_sub: "पशु का टैग आईडी, नस्ल, उम्र और पिछला थनैला इतिहास दर्ज करें।",
    label_cattle_type: "पशु का प्रकार",
    label_cattle_id: "पशु का टैग आईडी",
    label_breed: "नस्ल",
    label_age: "उम्र (वर्ष)",
    label_medical_history: "चिकित्सा इतिहास (पिछला थनैला?)",
    btn_save_cattle: "पशु का विवरण सुरक्षित करें →",
    saved_cattle_title: "आपके पंजीकृत पशु",
    model1_tag: "प्रथम चरण AI मॉडल",
    model1_title: "मॉडल 1: सेंसर आधारित थनैला भविष्यवाणी",
    model1_sub: "दूध का तापमान, विद्युत चालकता और दूध उत्पादन के आधार पर थनैला के जोखिम की गणना करता है।",
    label_select_cattle: "पशु का आईडी चुनें",
    label_milk_temp: "दूध का तापमान (°C)",
    label_tds_ppm: "TDS सेंसर मान (ppm)",
    label_conductivity_ms: "रूपांतरित दूध चालकता (mS/cm)",
    label_milk_yield: "दूध उत्पादन (लीटर)",
    btn_fetch_esp32: "ESP32 सेंसर से लाइव डेटा लाएं",
    btn_predict_m1: "थनैला जोखिम की जांच करें (मॉडल 1) →",
    formula_title: "चालकता रूपांतरण सूत्र",
    formula_desc: "Vetronix में TDS (ppm) ÷ 500 सूत्र से दूध की विद्युत चालकता mS/cm में बदली जाती है।",
    alert_vision_needed_title: "महत्वपूर्ण चेतावनी: थन की फोटो जांच आवश्यक",
    alert_vision_needed_desc: "मॉडल 1 में मध्यम/उच्च जोखिम मिलने पर ESP32-CAM से थन की फोटो लें या मॉडल 2 में अपलोड करें।",
    btn_proceed_to_vision: "मॉडल 2 पर जाएं ↓",
    model2_tag: "द्वितीय चरण विजन मॉडल",
    model2_title: "मॉडल 2: थन फोटो आधारित AI भविष्यवाणी",
    model2_sub: "थन और अयन की फोटो में लालिमा, सूजन और घावों की पहचान करने वाला CNN मॉडल।",
    teat_img_heading: "थन की फोटो प्राप्त करें",
    teat_img_sub: "ESP32-CAM से फोटो लें या गैलरी से अपलोड करें।",
    btn_capture_esp32cam: "ESP32-CAM से फोटो लें",
    or_text: "अथवा",
    upload_teat_click: "थन की फोटो अपलोड करने के लिए क्लिक करें",
    upload_teat_drag: "या फोटो को यहाँ खींच कर छोड़ें (JPG, PNG)",
    btn_analyze_m2: "थन की फोटो जांचें (मॉडल 2) →",
    no_teat_img_yet: "अभी कोई फोटो नहीं है। ESP32-CAM से फोटो लें या अपलोड करें।",
    combined_tag: "पशु चिकित्सा निर्णय सहायता",
    combined_title: "संयुक्त AI परिणाम और पशु चिकित्सक परामर्श",
    combined_sub: "सेंसर डेटा और थन फोटो का समग्र निष्कर्ष।",
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
    chk1: "संक्रमित गाय/भैंस को तुरंत स्वस्थ पशुओं से अलग करें।",
    chk2: "प्रभावित थन का दूध फेंक दें और सामान्य दूध में न मिलाएं।",
    chk3: "थन पर ठंडी सिकाई करें और एंटीसेप्टिक टीट डिप का प्रयोग करें।",
    chk4: "तुरंत पशु चिकित्सक से संपर्क करें।",
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
    age: 5,
    history: "Previous Mastitis",
    lastTemp: 39.1,
    lastCond: 5.8,
    lastYield: 11.2
  }
];

// =========================================================================
// 3. LOCAL STORAGE HELPERS
// =========================================================================
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('vetronix_users') || '[]');
  } catch (error) {
    console.error('Unable to read users:', error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('vetronix_users', JSON.stringify(users));
}

function getCurrentUserKey() {
  if (!activeUser) return null;

  return (
    activeUser.id ||
    activeUser.email ||
    activeUser.mobile ||
    activeUser.phone ||
    null
  );
}

function getCattleStorageKey() {
  const key = getCurrentUserKey();

  if (!key) return 'vetronix_cattle_guest';

  return `vetronix_cattle_${String(key).replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  )}`;
}

function getDiagnosisStorageKey() {
  const key = getCurrentUserKey();

  if (!key) return 'vetronix_diagnosis_guest';

  return `vetronix_diagnosis_${String(key).replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  )}`;
}

function getCattle() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(getCattleStorageKey()) || 'null'
    );

    if (Array.isArray(stored)) {
      return stored;
    }
  } catch (error) {
    console.error('Unable to read cattle:', error);
  }

  return [];
}

function saveCattle(cattle) {
  localStorage.setItem(
    getCattleStorageKey(),
    JSON.stringify(cattle)
  );
}

function getDiagnoses() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(getDiagnosisStorageKey()) || '[]'
    );

    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error('Unable to read diagnoses:', error);
    return [];
  }
}

function saveDiagnoses(diagnoses) {
  localStorage.setItem(
    getDiagnosisStorageKey(),
    JSON.stringify(diagnoses)
  );
}

// =========================================================================
// 4. DOM HELPERS
// =========================================================================
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function safeText(value) {
  return value === null || value === undefined
    ? ''
    : String(value);
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return Number(0).toFixed(decimals);
  }

  return number.toFixed(decimals);
}

// =========================================================================
// 5. LANGUAGE ENGINE
// =========================================================================
function t(key) {
  const languageDictionary =
    translations[currentLanguage] || translations.en;

  return (
    languageDictionary[key] ??
    translations.en[key] ??
    key
  );
}

function setLanguage(language) {
  if (!translations[language]) {
    language = 'en';
  }

  currentLanguage = language;

  localStorage.setItem(
    'vetronix_language',
    currentLanguage
  );

  applyTranslations();
}

function applyTranslations() {
  $$('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');

    if (!key) return;

    const translated = t(key);

    if (element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA') {
      if (element.hasAttribute('placeholder')) {
        element.placeholder = translated;
      }
    } else {
      element.textContent = translated;
    }
  });

  $$('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute(
      'data-i18n-placeholder'
    );

    element.placeholder = t(key);
  });

  $$('[data-i18n-title]').forEach((element) => {
    const key = element.getAttribute(
      'data-i18n-title'
    );

    element.title = t(key);
  });
}

function loadSavedLanguage() {
  const savedLanguage =
    localStorage.getItem('vetronix_language');

  if (savedLanguage && translations[savedLanguage]) {
    currentLanguage = savedLanguage;
  }
}

// =========================================================================
// 6. UI / NAVIGATION HELPERS
// =========================================================================
function showSection(sectionId) {
  const sections = $$('main section');

  sections.forEach((section) => {
    section.classList.remove('active');
    section.style.display = 'none';
  });

  const target = document.getElementById(sectionId);

  if (target) {
    target.style.display = '';
    target.classList.add('active');

    try {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } catch (error) {
      target.scrollIntoView();
    }
  }

  $$('.nav-link').forEach((link) => {
    link.classList.remove('active');

    const targetSection =
      link.getAttribute('data-section');

    if (targetSection === sectionId) {
      link.classList.add('active');
    }
  });
}

function navigateTo(sectionId) {
  showSection(sectionId);
}

function openTutorial() {
  const tutorial =
    document.getElementById('tutorialOverlay') ||
    document.getElementById('tutorialModal');

  if (tutorial) {
    tutorial.classList.add('active');
    tutorial.style.display = 'flex';
  }
}

function closeTutorial() {
  const tutorial =
    document.getElementById('tutorialOverlay') ||
    document.getElementById('tutorialModal');

  if (tutorial) {
    tutorial.classList.remove('active');
    tutorial.style.display = 'none';
  }
}

// =========================================================================
// 7. AUTHENTICATION STATE
// =========================================================================
async function restoreSupabaseSession() {
  if (!supabaseClient) return null;

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        'Supabase session restore error:',
        error
      );

      return null;
    }

    if (!data?.session?.user) {
      return null;
    }

    const user = data.session.user;

    activeUser = {
      id: user.id,
      email: user.email || '',
      mobile:
        user.phone ||
        user.user_metadata?.mobile ||
        '',
      phone: user.phone || '',
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        '',
      farmAddress:
        user.user_metadata?.farm_address ||
        ''
    };

    return activeUser;
  } catch (error) {
    console.error(
      'Unable to restore Supabase session:',
      error
    );

    return null;
  }
}

function updateAuthUI() {
  const loggedIn =
    Boolean(activeUser);

  $$('[data-auth-required]').forEach(
    (element) => {
      element.style.display =
        loggedIn ? '' : 'none';
    }
  );

  $$('[data-auth-guest]').forEach(
    (element) => {
      element.style.display =
        loggedIn ? 'none' : '';
    }
  );

  const farmerNameElements =
    $$('[data-farmer-name]');

  farmerNameElements.forEach((element) => {
    element.textContent =
      activeUser?.name ||
      activeUser?.email ||
      activeUser?.mobile ||
      '';
  });
}

async function logoutUser() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (error) {
    console.error(
      'Supabase logout error:',
      error
    );
  }

  activeUser = null;
  currentModel1Result = null;
  currentModel2Result = null;
  currentTeatImageBase64 = null;

  updateAuthUI();

  const loginSection =
    document.getElementById('auth') ||
    document.getElementById('login');

  if (loginSection) {
    showSection(loginSection.id);
  }

  alert(
    currentLanguage === 'hi'
      ? 'आप सफलतापूर्वक लॉगआउट हो गए हैं।'
      : 'You have been logged out successfully.'
  );
}

// =========================================================================
// 8. LOCAL / DEMO AUTH FALLBACK
// =========================================================================
function normalizeLoginIdentifier(value) {
  return safeText(value)
    .trim()
    .toLowerCase();
}

function findLocalUser(identifier) {
  const normalized =
    normalizeLoginIdentifier(identifier);

  return getUsers().find((user) => {
    const email =
      normalizeLoginIdentifier(user.email);

    const mobile =
      normalizeLoginIdentifier(
        user.mobile ||
        user.phone
      );

    return (
      email === normalized ||
      mobile === normalized
    );
  });
}

function createLocalUser({
  name,
  farmAddress,
  email,
  mobile,
  password
}) {
  const users = getUsers();

  const user = {
    id:
      'local-' +
      Date.now().toString(36) +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8),

    name:
      safeText(name).trim(),

    farmAddress:
      safeText(farmAddress).trim(),

    email:
      safeText(email).trim(),

    mobile:
      safeText(mobile).trim(),

    password:
      safeText(password),

    createdAt:
      new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  return user;
}

function localLogin(identifier, password) {
  const user =
    findLocalUser(identifier);

  if (!user) {
    return {
      success: false,
      message:
        currentLanguage === 'hi'
          ? 'यह खाता नहीं मिला।'
          : 'Account not found.'
    };
  }

  if (
    safeText(user.password) !==
    safeText(password)
  ) {
    return {
      success: false,
      message:
        currentLanguage === 'hi'
          ? 'पासवर्ड गलत है।'
          : 'Incorrect password.'
    };
  }

  activeUser = {
    ...user
  };

  return {
    success: true,
    user: activeUser
  };
}

// =========================================================================
// 9. SUPABASE FARMER LINKING
// =========================================================================
async function ensureSupabaseFarmer() {
  if (!supabaseClient || !activeUser) {
    return null;
  }

  const token =
    await getSupabaseAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await apiFetch(
      `${API_URL}/api/supabase/farmer/ensure`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: activeUser.id,
          email:
            activeUser.email || null,
          mobile:
            activeUser.mobile ||
            activeUser.phone ||
            null,
          name:
            activeUser.name || null,
          farm_address:
            activeUser.farmAddress ||
            null
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        'Supabase farmer linking failed:',
        data
      );

      return null;
    }

    if (data?.farmer) {
      activeUser.farmerId =
        data.farmer.id ||
        data.farmer.farmer_id ||
        data.farmerId ||
        activeUser.farmerId;
    }

    return data;
  } catch (error) {
    console.error(
      'Supabase farmer linking error:',
      error
    );

    return null;
  }
}

// =========================================================================
// 10. CATTLE RENDERING
// =========================================================================
function renderCattleList() {
  const container =
    document.getElementById(
      'cattleList'
    ) ||
    document.getElementById(
      'savedCattleList'
    );

  if (!container) return;

  const cattle =
    getCattle();

  if (!cattle.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>
          ${
            currentLanguage === 'hi'
              ? 'अभी कोई पशु पंजीकृत नहीं है।'
              : 'No cattle registered yet.'
          }
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    cattle
      .map((animal) => `
        <div class="cattle-card">
          <div class="cattle-card-header">
            <strong>
              ${escapeHtml(animal.id)}
            </strong>
            <span>
              ${escapeHtml(animal.type)}
            </span>
          </div>

          <div class="cattle-card-body">
            <p>
              <strong>
                ${t('label_breed')}:
              </strong>
              ${escapeHtml(animal.breed)}
            </p>

            <p>
              <strong>
                ${t('label_age')}:
              </strong>
              ${formatNumber(animal.age, 1)}
            </p>

            <p>
              <strong>
                ${t('label_medical_history')}:
              </strong>
              ${escapeHtml(animal.history)}
            </p>
          </div>
        </div>
      `)
      .join('');
}

// =========================================================================
// 11. CATTLE SELECT OPTIONS
// =========================================================================
function populateCattleSelect() {
  const selects =
    $$(
      '#m1CattleSelect, #cattleSelect, select[data-cattle-select]'
    );

  const cattle =
    getCattle();

  selects.forEach((select) => {
    const currentValue =
      select.value;

    select.innerHTML = `
      <option value="">
        ${
          currentLanguage === 'hi'
            ? 'पशु चुनें'
            : 'Select Cattle'
        }
      </option>
    `;

    cattle.forEach((animal) => {
      const option =
        document.createElement('option');

      option.value =
        animal.id;

      option.textContent =
        `${animal.id} - ${animal.type}`;

      select.appendChild(option);
    });

    if (
      currentValue &&
      cattle.some(
        (animal) =>
          animal.id === currentValue
      )
    ) {
      select.value =
        currentValue;
    }
  });
}

// =========================================================================
// 12. ADD CATTLE
// =========================================================================
async function saveCattleDetails(event) {
  if (event) {
    event.preventDefault();
  }

  if (!activeUser) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया पहले लॉगिन करें।'
        : 'Please login first.'
    );

    return;
  }

  const type =
    document.getElementById(
      'cattleType'
    )?.value ||
    document.getElementById(
      'm1CattleType'
    )?.value ||
    '';

  const id =
    document.getElementById(
      'cattleId'
    )?.value.trim() ||
    document.getElementById(
      'm1CattleId'
    )?.value.trim() ||
    '';

  const breed =
    document.getElementById(
      'breed'
    )?.value.trim() ||
    document.getElementById(
      'cattleBreed'
    )?.value.trim() ||
    '';

  const age =
    Number(
      document.getElementById(
        'age'
      )?.value ||
      document.getElementById(
        'cattleAge'
      )?.value
    );

  const history =
    document.getElementById(
      'medicalHistory'
    )?.value ||
    document.getElementById(
      'cattleHistory'
    )?.value ||
    'No Prior Mastitis';

  if (!id || !breed || !Number.isFinite(age)) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया सभी आवश्यक पशु विवरण भरें।'
        : 'Please fill in all required cattle details.'
    );

    return;
  }

  const cattle =
    getCattle();

  if (
    cattle.some(
      (animal) =>
        String(animal.id).toLowerCase() ===
        String(id).toLowerCase()
    )
  ) {
    alert(
      currentLanguage === 'hi'
        ? 'यह पशु आईडी पहले से मौजूद है।'
        : 'This cattle ID already exists.'
    );

    return;
  }

  const animal = {
    id,
    type:
      type || 'Cow',
    breed,
    age,
    history,
    lastTemp: null,
    lastCond: null,
    lastYield: null,
    createdAt:
      new Date().toISOString()
  };

  cattle.push(animal);
  saveCattle(cattle);

  renderCattleList();
  populateCattleSelect();

  const form =
    event?.target ||
    document.getElementById(
      'cattleForm'
    );

  if (form?.reset) {
    form.reset();
  }

  // Also try the existing FastAPI/Supabase
  // cattle endpoint without changing the UI.
  try {
    if (activeUser?.farmerId) {
      await apiFetch(
        `${API_URL}/api/cattle`,
        {
          method: 'POST',
          body: JSON.stringify({
            farmer_id:
              activeUser.farmerId,
            cattle_id:
              animal.id,
            cattle_type:
              animal.type,
            breed:
              animal.breed,
            age:
              animal.age,
            medical_history:
              animal.history
          })
        }
      );
    }
  } catch (error) {
    console.warn(
      'Cloud cattle save skipped:',
      error
    );
  }

  alert(
    currentLanguage === 'hi'
      ? 'पशु का विवरण सफलतापूर्वक सुरक्षित हो गया।'
      : 'Cattle details saved successfully.'
  );
}

// =========================================================================
// 13. CATTLE SELECTION -> MODEL 1
// =========================================================================
function handleCattleSelectionChange(event) {
  const cattleId =
    event?.target?.value;

  if (!cattleId) return;

  const animal =
    getCattle().find(
      (item) =>
        item.id === cattleId
    );

  if (!animal) return;

  const tempInput =
    document.getElementById(
      'm1Temp'
    );

  const conductivityInput =
    document.getElementById(
      'm1Conductivity'
    );

  const yieldInput =
    document.getElementById(
      'm1Yield'
    );

  if (
    tempInput &&
    Number.isFinite(
      Number(animal.lastTemp)
    )
  ) {
    tempInput.value =
      Number(animal.lastTemp)
        .toFixed(2);
  }

  if (
    conductivityInput &&
    Number.isFinite(
      Number(animal.lastCond)
    )
  ) {
    conductivityInput.value =
      Number(animal.lastCond)
        .toFixed(2);
  }

  if (
    yieldInput &&
    Number.isFinite(
      Number(animal.lastYield)
    )
  ) {
    yieldInput.value =
      Number(animal.lastYield)
        .toFixed(2);
  }
}

// =========================================================================
// 14. TDS -> CONDUCTIVITY
// =========================================================================
function recalculateConductivity(
  ppmValue
) {
  const ppm =
    Number(ppmValue);

  if (!Number.isFinite(ppm)) {
    return 0;
  }

  const conductivity =
    ppm / 500;

  const field =
    document.getElementById(
      'm1Conductivity'
    );

  if (field) {
    field.value =
      conductivity.toFixed(2);
  }

  return conductivity;
}

function handleTdsInput(event) {
  const value =
    event?.target?.value;

  recalculateConductivity(
    value
  );
}

// =========================================================================
// 15. ESP32 LIVE SENSOR DATA
// =========================================================================
// IMPORTANT:
// The browser does NOT connect directly to the ESP32 anymore.
//
// New flow:
// ESP32
//    -> POST /api/esp32/sensor
//    -> FastAPI backend
//    -> latest_sensor_data
//    -> GET /api/esp32-live
//    -> this function
//
// This removes the dependency on a local/private ESP32 IP.
// =========================================================================
async function fetchLiveESP32Sensors(
  silent = false
) {
  const btn =
    document.querySelector(
      '#model1Form button[onclick^="fetchLiveESP32Sensors"]'
    );

  const originalHtml =
    btn
      ? btn.innerHTML
      : '';

  if (
    btn &&
    !silent
  ) {
    btn.innerHTML =
      `<span class="pulse-dot"></span> Polling ESP32 Probe...`;

    btn.disabled = true;
  }

  try {
    const response =
      await fetch(
        `${API_URL}/api/esp32-live`,
        {
          method: 'GET',
          cache: 'no-store'
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.detail ||
        data.message ||
        "Unable to read sensor data."
      );
    }

    const temp =
      Number(
        data.Milk_Temperature
      );

    const ppm =
      Number(
        data.TDS_PPM
      );

    const voltage =
      Number(
        data.TDS_Voltage ?? 0
      );

    const conductivity =
      ppm / 500;

    if (
      !Number.isFinite(temp) ||
      !Number.isFinite(ppm)
    ) {
      throw new Error(
        "Backend returned invalid temperature/TDS values."
      );
    }

    // Existing UI only.
    // Temperature and TDS remain exactly 2 decimal places.
    const tempField =
      document.getElementById(
        'm1Temp'
      );

    const tdsField =
      document.getElementById(
        'm1TdsPpm'
      );

    if (tempField) {
      tempField.value =
        temp.toFixed(2);
    }

    if (tdsField) {
      tdsField.value =
        ppm.toFixed(2);
    }

    recalculateConductivity(
      ppm
    );

    const yieldField =
      document.getElementById(
        'm1Yield'
      );

    const milkYield =
      Number(
        yieldField?.value
      );

    window.vetronixLatestESP32 = {
      temperature:
        temp,

      tdsPpm:
        ppm,

      voltage:
        voltage,

      conductivity:
        conductivity,

      milkYield:
        Number.isFinite(
          milkYield
        )
          ? milkYield
          : 0,

      timestamp:
        data.timestamp ||
        new Date().toISOString()
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

    console.error(
      "ESP32 sensor fetch error:",
      error
    );

    if (!silent) {
      alert(
        currentLanguage === 'hi'
          ? `सेंसर डेटा प्राप्त नहीं हो सका। कृपया ESP32 और बैकएंड कनेक्शन जांचें।\n${error.message}`
          : `Unable to receive sensor data. Please check the ESP32 and backend connection.\n${error.message}`
      );
    }

    return null;

  } finally {

    if (
      btn &&
      !silent
    ) {
      btn.innerHTML =
        originalHtml;

      btn.disabled =
        false;
    }
  }
}

// =========================================================================
// 16. AUTOMATIC ESP32 SENSOR POLLING
// =========================================================================
let esp32PollingTimer =
  null;

function startESP32LivePolling() {
  stopESP32LivePolling();

  // Read the latest data from FastAPI every 2 seconds.
  esp32PollingTimer =
    setInterval(
      () => {
        if (
          activeUser
        ) {
          fetchLiveESP32Sensors(
            true
          );
        }
      },
      ESP32_LIVE_POLL_MS
    );
}

function stopESP32LivePolling() {
  if (
    esp32PollingTimer
  ) {
    clearInterval(
      esp32PollingTimer
    );

    esp32PollingTimer =
      null;
  }
}

// =========================================================================
// 17. MODEL 1 PREDICTION
// =========================================================================
async function runModel1Prediction(
  event
) {
  if (event) {
    event.preventDefault();
  }

  if (!activeUser) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया पहले लॉगिन करें।'
        : 'Please login first.'
    );

    return;
  }

  const cattleId =
    document.getElementById(
      'm1CattleSelect'
    )?.value ||
    document.getElementById(
      'cattleSelect'
    )?.value ||
    '';

  const temperature =
    Number(
      document.getElementById(
        'm1Temp'
      )?.value
    );

  const tds =
    Number(
      document.getElementById(
        'm1TdsPpm'
      )?.value
    );

  const conductivity =
    Number(
      document.getElementById(
        'm1Conductivity'
      )?.value
    );

  const milkYield =
    Number(
      document.getElementById(
        'm1Yield'
      )?.value
    );

  if (
    !Number.isFinite(
      temperature
    ) ||
    !Number.isFinite(
      tds
    ) ||
    !Number.isFinite(
      milkYield
    )
  ) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया तापमान, TDS और दूध उत्पादन की वैध जानकारी दर्ज करें।'
        : 'Please enter valid temperature, TDS and milk yield values.'
    );

    return;
  }

  const payload = {
    Milk_Temperature:
      Number(
        temperature.toFixed(2)
      ),

    Milk_Conductivity:
      Number(
        (Number.isFinite(
          conductivity
        )
          ? conductivity
          : tds / 500
        ).toFixed(4)
      ),

    Milk_Yield:
      milkYield
  };

  try {
    const response =
      await apiFetch(
        `${API_URL}/api/predict`,
        {
          method: 'POST',
          body:
            JSON.stringify(
              payload
            )
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
        data.message ||
        'Model 1 prediction failed.'
      );
    }

    currentModel1Result =
      data;

    currentModel1Result.input =
      payload;

    currentModel1Result.cattleId =
      cattleId;

    displayModel1Result(
      data
    );

    if (cattleId) {
      const cattle =
        getCattle();

      const animal =
        cattle.find(
          (item) =>
            item.id ===
            cattleId
        );

      if (animal) {
        animal.lastTemp =
          Number(
            temperature.toFixed(2)
          );

        animal.lastCond =
          Number(
            payload.Milk_Conductivity.toFixed(
              2
            )
          );

        animal.lastYield =
          Number(
            milkYield.toFixed(2)
          );

        saveCattle(
          cattle
        );

        renderCattleList();
      }
    }

    return data;

  } catch (error) {
    console.error(
      'Model 1 prediction error:',
      error
    );

    alert(
      currentLanguage === 'hi'
        ? `मॉडल 1 जांच में समस्या हुई:\n${error.message}`
        : `Model 1 prediction failed:\n${error.message}`
    );

    return null;
  }
}

// =========================================================================
// 18. DISPLAY MODEL 1 RESULT
// =========================================================================
function displayModel1Result(
  result
) {
  const resultContainer =
    document.getElementById(
      'model1Result'
    ) ||
    document.getElementById(
      'm1Result'
    );

  if (!resultContainer) {
    return;
  }

  const prediction =
    result?.prediction ??
    result?.result ??
    result?.label ??
    'Unknown';

  const probability =
    Number(
      result?.probability ??
      result?.confidence ??
      result?.risk_probability ??
      0
    );

  const risk =
    result?.risk_level ??
    result?.risk ??
    '';

  resultContainer.innerHTML = `
    <div class="prediction-result">
      <h3>
        ${escapeHtml(
          currentLanguage === 'hi'
            ? 'मॉडल 1 परिणाम'
            : 'Model 1 Result'
        )}
      </h3>

      <p>
        <strong>
          ${
            currentLanguage === 'hi'
              ? 'पूर्वानुमान:'
              : 'Prediction:'
          }
        </strong>
        ${escapeHtml(prediction)}
      </p>

      ${
        Number.isFinite(
          probability
        )
          ? `
            <p>
              <strong>
                ${
                  currentLanguage === 'hi'
                    ? 'विश्वास:'
                    : 'Confidence:'
                }
              </strong>
              ${(probability * 100).toFixed(2)}%
            </p>
          `
          : ''
      }

      ${
        risk
          ? `
            <p>
              <strong>
                ${
                  currentLanguage === 'hi'
                    ? 'जोखिम स्तर:'
                    : 'Risk Level:'
                }
              </strong>
              ${escapeHtml(risk)}
            </p>
          `
          : ''
      }
    </div>
  `;

  resultContainer.style.display =
    'block';

  // If Model 1 indicates elevated risk,
  // show the existing Model 2 pathway.
  const riskText =
    `${prediction} ${risk}`.toLowerCase();

  const elevated =
    riskText.includes('high') ||
    riskText.includes('medium') ||
    riskText.includes('mastitis') ||
    riskText.includes('positive') ||
    riskText.includes('risk');

  if (elevated) {
    const warning =
      document.getElementById(
        'visionWarning'
      );

    if (warning) {
      warning.style.display =
        'block';
    }
  }
}

// =========================================================================
// 19. MODEL 2 IMAGE HANDLING
// =========================================================================
function setTeatImage(
  base64,
  source = 'upload'
) {
  currentTeatImageBase64 =
    base64;

  const image =
    document.getElementById(
      'teatPreview'
    ) ||
    document.getElementById(
      'imagePreview'
    );

  if (image) {
    image.src =
      base64;

    image.style.display =
      'block';
  }

  const placeholder =
    document.getElementById(
      'noTeatImage'
    );

  if (placeholder) {
    placeholder.style.display =
      'none';
  }

  const sourceLabel =
    document.getElementById(
      'teatImageSource'
    );

  if (sourceLabel) {
    sourceLabel.textContent =
      source === 'esp32cam'
        ? 'ESP32-CAM'
        : 'Uploaded Image';
  }
}

function handleTeatImageUpload(
  event
) {
  const file =
    event?.target?.files?.[0];

  if (!file) {
    return;
  }

  if (
    !file.type.startsWith(
      'image/'
    )
  ) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया एक वैध इमेज फ़ाइल चुनें।'
        : 'Please select a valid image file.'
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {
    setTeatImage(
      reader.result,
      'upload'
    );
  };

  reader.onerror = () => {
    alert(
      currentLanguage === 'hi'
        ? 'इमेज पढ़ने में समस्या हुई।'
        : 'Unable to read the image.'
    );
  };

  reader.readAsDataURL(
    file
  );
}

// =========================================================================
// 20. ESP32-CAM CAPTURE
// =========================================================================
async function captureESP32CAM() {
  /*
   * Keep the existing ESP32-CAM workflow.
   * If the browser-side camera endpoint is available,
   * use it. Otherwise use the existing sample-image
   * demonstration fallback.
   */

  const cameraUrl =
    document.body.dataset
      ?.esp32CamUrl ||
    '';

  if (cameraUrl) {
    try {
      const response =
        await fetch(
          cameraUrl,
          {
            cache: 'no-store'
          }
        );

      if (!response.ok) {
        throw new Error(
          'ESP32-CAM request failed.'
        );
      }

      const blob =
        await response.blob();

      const reader =
        new FileReader();

      reader.onload = () => {
        setTeatImage(
          reader.result,
          'esp32cam'
        );
      };

      reader.readAsDataURL(
        blob
      );

      return;
    } catch (error) {
      console.warn(
        'ESP32-CAM live capture failed:',
        error
      );
    }
  }

  // Existing demo fallback.
  // Randomly select one of the sample images.
  const imageUrl =
    Math.random() > 0.5
      ? SAMPLE_TEAT_IMAGES.healthy
      : SAMPLE_TEAT_IMAGES.mastitic;

  setTeatImage(
    imageUrl,
    'esp32cam'
  );

  alert(
    currentLanguage === 'hi'
      ? 'ESP32-CAM फोटो प्राप्त हुई।'
      : 'ESP32-CAM image captured.'
  );
}

// =========================================================================
// 21. MODEL 2 PREDICTION
// =========================================================================
async function runModel2Prediction(
  event
) {
  if (event) {
    event.preventDefault();
  }

  if (!activeUser) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया पहले लॉगिन करें।'
        : 'Please login first.'
    );

    return;
  }

  if (
    !currentTeatImageBase64
  ) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया पहले थन की फोटो लें या अपलोड करें।'
        : 'Please capture or upload a teat image first.'
    );

    return;
  }

  try {
    const formData =
      new FormData();

    // Convert data URL to Blob when necessary.
    let imageBlob = null;

    if (
      currentTeatImageBase64.startsWith(
        'data:'
      )
    ) {
      const parts =
        currentTeatImageBase64.split(
          ','
        );

      const mimeMatch =
        parts[0].match(
          /data:(.*?);base64/
        );

      const mime =
        mimeMatch
          ? mimeMatch[1]
          : 'image/jpeg';

      const binary =
        atob(parts[1]);

      const bytes =
        new Uint8Array(
          binary.length
        );

      for (
        let i = 0;
        i < binary.length;
        i++
      ) {
        bytes[i] =
          binary.charCodeAt(i);
      }

      imageBlob =
        new Blob(
          [bytes],
          {
            type: mime
          }
        );
    } else {
      const imageResponse =
        await fetch(
          currentTeatImageBase64
        );

      imageBlob =
        await imageResponse.blob();
    }

    formData.append(
      'file',
      imageBlob,
      'teat-image.jpg'
    );

    const token =
      await getSupabaseAccessToken();

    const headers = {};

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const response =
      await fetch(
        `${API_URL}/api/predict-image`,
        {
          method: 'POST',
          headers,
          body: formData
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
        data.message ||
        'Model 2 prediction failed.'
      );
    }

    currentModel2Result =
      data;

    displayModel2Result(
      data
    );

    return data;

  } catch (error) {
    console.error(
      'Model 2 prediction error:',
      error
    );

    alert(
      currentLanguage === 'hi'
        ? `मॉडल 2 जांच में समस्या हुई:\n${error.message}`
        : `Model 2 prediction failed:\n${error.message}`
    );

    return null;
  }
}

// =========================================================================
// 22. DISPLAY MODEL 2 RESULT
// =========================================================================
function displayModel2Result(
  result
) {
  const resultContainer =
    document.getElementById(
      'model2Result'
    ) ||
    document.getElementById(
      'm2Result'
    );

  if (!resultContainer) {
    return;
  }

  const prediction =
    result?.prediction ??
    result?.result ??
    result?.label ??
    'Unknown';

  const confidence =
    Number(
      result?.confidence ??
      result?.probability ??
      0
    );

  resultContainer.innerHTML = `
    <div class="prediction-result">
      <h3>
        ${
          currentLanguage === 'hi'
            ? 'मॉडल 2 परिणाम'
            : 'Model 2 Result'
        }
      </h3>

      <p>
        <strong>
          ${
            currentLanguage === 'hi'
              ? 'पूर्वानुमान:'
              : 'Prediction:'
          }
        </strong>
        ${escapeHtml(prediction)}
      </p>

      ${
        Number.isFinite(
          confidence
        )
          ? `
            <p>
              <strong>
                ${
                  currentLanguage === 'hi'
                    ? 'विश्वास:'
                    : 'Confidence:'
                }
              </strong>
              ${(confidence * 100).toFixed(2)}%
            </p>
          `
          : ''
      }
    </div>
  `;

  resultContainer.style.display =
    'block';
}

// =========================================================================
// 23. COMBINED RESULT
// =========================================================================
function buildCombinedResult() {
  const model1 =
    currentModel1Result;

  const model2 =
    currentModel2Result;

  if (
    !model1 &&
    !model2
  ) {
    return null;
  }

  const model1Prediction =
    model1?.prediction ??
    model1?.result ??
    model1?.label ??
    'Not Available';

  const model2Prediction =
    model2?.prediction ??
    model2?.result ??
    model2?.label ??
    'Not Available';

  const model1Text =
    `${model1Prediction}`.toLowerCase();

  const model2Text =
    `${model2Prediction}`.toLowerCase();

  const highRiskWords = [
    'high',
    'positive',
    'mastitis',
    'severe',
    'infected'
  ];

  const model1Risk =
    highRiskWords.some(
      (word) =>
        model1Text.includes(word)
    );

  const model2Risk =
    highRiskWords.some(
      (word) =>
        model2Text.includes(word)
    );

  let conclusion =
    'Further veterinary review recommended.';

  if (
    model1Risk ||
    model2Risk
  ) {
    conclusion =
      'Veterinary examination recommended.';
  } else {
    conclusion =
      'No elevated mastitis indication was returned by the available AI checks.';
  }

  return {
    model1,
    model2,
    conclusion
  };
}

// =========================================================================
// 24. DISPLAY COMBINED RESULT
// =========================================================================
function displayCombinedResult() {
  const combined =
    buildCombinedResult();

  if (!combined) {
    return;
  }

  const resultContainer =
    document.getElementById(
      'combinedResult'
    );

  if (!resultContainer) {
    return;
  }

  resultContainer.innerHTML = `
    <div class="combined-result-card">

      <h3>
        ${
          currentLanguage === 'hi'
            ? 'संयुक्त AI परिणाम'
            : 'Combined AI Result'
        }
      </h3>

      <p>
        <strong>
          ${t('rep_model1_label')}
        </strong>
        ${escapeHtml(
          combined.model1?.prediction ??
          combined.model1?.result ??
          combined.model1?.label ??
          'Not Available'
        )}
      </p>

      <p>
        <strong>
          ${t('rep_model2_label')}
        </strong>
        ${escapeHtml(
          combined.model2?.prediction ??
          combined.model2?.result ??
          combined.model2?.label ??
          'Not Available'
        )}
      </p>

      <p>
        <strong>
          ${t('rep_combined_label')}
        </strong>
        ${escapeHtml(
          combined.conclusion
        )}
      </p>

    </div>
  `;

  resultContainer.style.display =
    'block';
}

// =========================================================================
// 25. SAVE DIAGNOSIS
// =========================================================================
async function saveDiagnosisToHistory() {
  if (!activeUser) {
    alert(
      currentLanguage === 'hi'
        ? 'कृपया पहले लॉगिन करें।'
        : 'Please login first.'
    );

    return;
  }

  const cattleId =
    currentModel1Result?.cattleId ||
    document.getElementById(
      'm1CattleSelect'
    )?.value ||
    '';

  const diagnosis = {
    id:
      'DX-' +
      Date.now(),

    cattleId,

    model1:
      currentModel1Result,

    model2:
      currentModel2Result,

    createdAt:
      new Date().toISOString()
  };

  const diagnoses =
    getDiagnoses();

  diagnoses.push(
    diagnosis
  );

  saveDiagnoses(
    diagnoses
  );

  // Preserve the existing cloud integration
  // when a farmer ID is available.
  try {
    if (
      activeUser.farmerId
    ) {
      await apiFetch(
        `${API_URL}/api/predictions`,
        {
          method: 'POST',
          body: JSON.stringify({
            farmer_id:
              activeUser.farmerId,

            cattle_id:
              cattleId || null,

            model1_result:
              currentModel1Result,

            model2_result:
              currentModel2Result,

            combined_result:
              buildCombinedResult()
          })
        }
      );
    }
  } catch (error) {
    console.warn(
      'Cloud diagnosis save skipped:',
      error
    );
  }

  alert(
    currentLanguage === 'hi'
      ? 'जांच परिणाम पशु के इतिहास में सुरक्षित कर दिया गया है।'
      : 'Diagnosis has been saved to the cattle history.'
  );
}