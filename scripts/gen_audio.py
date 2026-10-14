#!/usr/bin/env python3
"""
gen_audio.py — VoiceCheckout Audio Asset Generator

Generates high-quality prerecorded MP3 voice guidance files using edge-tts.
Voices:
  - English: en-IN-NeerjaNeural
  - Telugu:  te-IN-ShrutiNeural
  - Hindi:   hi-IN-SwaraNeural

Asset convention:
  public/audio/{lang}/{messageKey}.mp3
"""

import asyncio
import os
import sys
from pathlib import Path
import edge_tts

VOICES = {
    "en": "en-IN-NeerjaNeural",
    "te": "te-IN-ShrutiNeural",
    "hi": "hi-IN-SwaraNeural",
}

# Canonical audio scripts aligned across English, Telugu, and Hindi
AUDIO_PHRASES = {
    # Language names
    "lang_name_en": {
        "en": "English",
        "te": "ఇంగ్లీష్",
        "hi": "अंग्रेज़ी",
    },
    "lang_name_te": {
        "en": "Telugu",
        "te": "తెలుగు",
        "hi": "तेलुगू",
    },
    "lang_name_hi": {
        "en": "Hindi",
        "te": "హిందీ",
        "hi": "हिन्दी",
    },

    # Guidance stages
    "welcome_instruction": {
        "en": "Welcome to VoiceCheckout. I will guide you through your checkout step by step. Press start assistance to begin.",
        "te": "వాయిస్‌చెక్అవుట్‌కు స్వాగతం. మీ చెక్అవుట్ ప్రక్రియలో నేను ప్రతి అడుగులో మీకు సహాయం చేస్తాను. ప్రారంభించడానికి స్టార్ట్ అసిస్టెన్స్ నొక్కండి.",
        "hi": "वॉइसचेकआउट में आपका स्वागत है। मैं हर कदम पर आपकी चेकआउट में मदद करूँगा। शुरू करने के लिए स्टार्ट असिस्टेंस दबाएं।",
    },
    "language_instruction": {
        "en": "Choose your preferred language. You can listen to each language name before deciding. Then press continue.",
        "te": "మీకు నచ్చిన భాషను ఎంచుకోండి. నిర్ణయించే ముందు ప్రతి భాష పేరును వినవచ్చు. తర్వాత కంటిన్యూ నొక్కండి.",
        "hi": "अपनी पसंदीदा भाषा चुनें। तय करने से पहले आप हर भाषा का नाम सुन सकते हैं। फिर जारी रखें दबाएं।",
    },
    "address_instruction": {
        "en": "Please verify your delivery address on the page, then click confirm address to continue.",
        "te": "దయచేసి పేజీలో మీ డెలివరీ చిరునామాను సరిచూసుకోండి, తర్వాత కంటిన్యూ చేయడానికి కన్ఫర్మ్ అడ్రస్ క్లిక్ చేయండి.",
        "hi": "कृपया पेज पर अपना डिलीवरी पता जांचें, फिर आगे बढ़ने के लिए कन्फर्म एड्रेस पर क्लिक करें।",
    },
    "address_change_instruction": {
        "en": "Address change is simulated for this demo. Press back to return to address confirmation.",
        "te": "ఈ డెమో కోసం చిరునామా మార్పు అనుకరణ మాత్రమే. చిరునామా నిర్ధారణకు తిరిగి వెళ్ళడానికి వెనుకకు నొక్కండి.",
        "hi": "इस डेमो के लिए पता बदलना केवल सिम्युलेटेड है। पता पुष्टि पर लौटने के लिए पीछे जाएं दबाएं।",
    },
    "method_instruction": {
        "en": "Select the simulated UPI payment option on the page, then click continue to review your order.",
        "te": "పేజీలో అనుకరణ యూపీఐ చెల్లింపును ఎంచుకోండి, తర్వాత మీ ఆర్డర్ సమీక్షించడానికి కంటిన్యూ క్లిక్ చేయండి.",
        "hi": "पेज पर सिम्युलेटेड यूपीआई भुगतान विकल्प चुनें, फिर अपने ऑर्डर की समीक्षा करने के लिए जारी रखें पर क्लिक करें।",
    },
    "review_instruction": {
        "en": "Review your items, delivery option, payment method, and grand total. Then click confirm order to proceed.",
        "te": "ఆర్డర్ ఇచ్చే ముందు దయచేసి మీ వస్తువులు, డెలివరీ ఎంపిక, చెల్లింపు పద్ధతి మరియు మొత్తం మొత్తాన్ని సమీక్షించండి. తర్వాత కన్ఫర్మ్ ఆర్డర్ క్లిక్ చేయండి.",
        "hi": "ऑर्डर देने से पहले कृपया अपने सामान, डिलीवरी विकल्प, भुगतान विधि और कुल राशि की समीक्षा करें। फिर कन्फर्म ऑर्डर पर क्लिक करें।",
    },
    "upi_simulation_instruction": {
        "en": "This is a simulated UPI payment screen. Never tell anyone your PIN. Click confirm simulated payment to proceed.",
        "te": "ఇది అనుకరణ యూపీఐ చెల్లింపు స్క్రీన్. మీ పిన్ ఎవరికీ చెప్పవద్దు. కొనసాగించడానికి కన్ఫర్మ్ సిమ్యులేటెడ్ పేమెంట్ క్లిక్ చేయండి.",
        "hi": "यह एक सिम्युलेटेड यूपीआई भुगतान स्क्रीन है। अपना पिन कभी किसी को न बताएं। आगे बढ़ने के लिए कन्फर्म सिम्युलेटेड पेमेंट पर क्लिक करें।",
    },
    "processing_instruction": {
        "en": "Your simulated payment is being processed. Please wait a moment while we check the status.",
        "te": "మీ అనుకరణ చెల్లింపు ప్రాసెస్ అవుతోంది. స్థితిని తనిఖీ చేస్తున్నప్పుడు దయచేసి కాసేపు వేచి ఉండండి.",
        "hi": "आपका सिम्युलेटेड भुगतान प्रोसेस हो रहा है। स्थिति की जांच करते समय कृपया थोड़ा इंतजार करें।",
    },
    "success_instruction": {
        "en": "Simulated payment successful! Your demo order has been placed.",
        "te": "అనుకరణ చెల్లింపు విజయవంతమైంది! మీ డెమో ఆర్డర్ పూర్తయింది.",
        "hi": "सिम्युलेटेड भुगतान सफल रहा! आपका डेमो ऑर्डर पूरा हो गया है।",
    },
    "failed_instruction": {
        "en": "Simulated payment failed. No money was deducted. You can click retry payment to try again safely.",
        "te": "అనుకరణ చెల్లింపు విఫలమైంది. డబ్బు ఏమీ కట్ కాలేదు. సురక్షితంగా మళ్ళీ ప్రయత్నించడానికి రీట్రై పేమెంట్ క్లిక్ చేయవచ్చు.",
        "hi": "सिम्युलेटेड भुगतान विफल रहा। कोई पैसे नहीं कटे। आप सुरक्षित रूप से दोबारा प्रयास करने के लिए पुनः प्रयास करें पर क्लिक कर सकते हैं।",
    },
    "pending_instruction": {
        "en": "Simulated payment is currently pending. Please do not pay again while the status is being resolved.",
        "te": "అనుకరణ చెల్లింపు పెండింగ్‌లో ఉంది. స్థితి పరిష్కారమయ్యే వరకు దయచేసి మళ్ళీ చెల్లించవద్దు.",
        "hi": "सिम्युलेटेड भुगतान अभी पेंडिंग है। स्थिति स्पष्ट होने तक कृपया दोबारा भुगतान न करें।",
    },
    "retry_instruction": {
        "en": "Click retry payment to return to payment method selection safely.",
        "te": "చెల్లింపు పద్ధతికి సురక్షితంగా తిరిగి వెళ్ళడానికి రీట్రై పేమెంట్ క్లిక్ చేయండి.",
        "hi": "भुगतान विधि पर सुरक्षित रूप से लौटने के लिए पुनः प्रयास पर क्लिक करें।",
    },

    # Mandatory Safety Warning
    "upi_safety_warning": {
        "en": "Never tell anyone your PIN.",
        "te": "మీ పిన్ ఎవరికీ చెప్పవద్దు.",
        "hi": "अपना पिन कभी किसी को न बताएं।",
    },

    # Spoken Price Wording
    "order_total_spoken": {
        "en": "Your grand total amount is one thousand five hundred ninety-eight rupees.",
        "te": "మీ ఆర్డర్ మొత్తం మొత్తం వెయ్యి ఐదు వందల తొంభై ఎనిమిది రూపాయలు.",
        "hi": "आपके ऑर्डर की कुल राशि एक हज़ार पाँच सौ अट्ठानवे रुपये है।",
    },

    # Informational notices
    "audio_unavailable": {
        "en": "Audio prompt is currently unavailable.",
        "te": "ఆడియో ప్రాంప్ట్ ప్రస్తుతం అందుబాటులో లేదు.",
        "hi": "ऑडियो प्रॉम्प्ट अभी उपलब्ध नहीं है।",
    },
    "audio_playback_failed": {
        "en": "Audio playback failed. Please continue reading the on-screen instructions.",
        "te": "ఆడియో ప్లేబ్యాక్ విఫలమైంది. దయచేసి స్క్రీన్‌పై సూచనలను చదవడం కొనసాగించండి.",
        "hi": "ऑडियो प्लेबैक विफल रहा। कृपया स्क्रीन पर दिए गए निर्देशों को पढ़ना जारी रखें।",
    },
    "unsupported_page": {
        "en": "This page is not supported by VoiceCheckout. VoiceCheckout only works on the controlled demo checkout page.",
        "te": "ఈ పేజీకి వాయిస్‌చెక్అవుట్ మద్దతు లేదు. వాయిస్‌చెక్అవుట్ డెమో చెక్అవుట్ పేజీలో మాత్రమే పనిచేస్తుంది.",
        "hi": "यह पेज वॉइसचेकआउट द्वारा समर्थित नहीं है। वॉइसचेकआउट केवल नियंत्रित डेमो चेकआउट पेज पर काम करता है।",
    },

    # ShopSphere Guidance Stages — Fully Dedicated Audio
    "shopsphere_landing_instruction": {
        "en": "Welcome! Browse the products and choose an item you would like to buy.",
        "te": "స్వాగతం! ఉత్పత్తులను బ్రౌజ్ చేయండి మరియు మీరు కొనాలనుకుంటున్న వస్తువును ఎంచుకోండి.",
        "hi": "स्वागत है! उत्पादों को ब्राउज़ करें और वह आइटम चुनें जिसे आप खरीदना चाहते हैं।",
    },
    "shopsphere_product_instruction": {
        "en": "Review the product details, choose the quantity, and add it to your cart.",
        "te": "ఉత్పత్తి వివరాలను సమీక్షించండి, పరిమాణాన్ని ఎంచుకోండి మరియు మీ కార్ట్‌కు జోడించండి.",
        "hi": "उत्पाद विवरण की समीक्षा करें, मात्रा चुनें और इसे अपने कार्ट में जोड़ें।",
    },
    "shopsphere_cart_instruction": {
        "en": "Review your items and total, then continue to checkout when you are ready.",
        "te": "మీ వస్తువులను మరియు మొత్తాన్ని సమీక్షించండి, సిద్ధంగా ఉన్నప్పుడు చెక్అవుట్‌కు కొనసాగండి.",
        "hi": "अपने आइटम और कुल राशि की समीक्षा करें, फिर तैयार होने पर चेकआउट जारी रखें।",
    },
    "shopsphere_address_instruction": {
        "en": "Select a demonstration delivery address or add a sample address to continue.",
        "te": "కొనసాగడానికి డెమో డెలివరీ చిరునామాను ఎంచుకోండి లేదా నమూనా చిరునామాను జోడించండి.",
        "hi": "जारी रखने के लिए एक डेमो डिलीवरी पता चुनें या एक नमूना पता जोड़ें।",
    },
    "shopsphere_delivery_instruction": {
        "en": "Choose your preferred demonstration delivery option.",
        "te": "మీకు నచ్చిన డెమో డెలివరీ ఎంపికను ఎంచుకోండి.",
        "hi": "अपना पसंदीदा डेमो डिलीवरी विकल्प चुनें।",
    },
    "shopsphere_payment_instruction": {
        "en": "Choose a simulated payment method. No real payment will be made.",
        "te": "సిమ్యులేటెడ్ చెల్లింపు పద్ధతిని ఎంచుకోండి. ఎటువంటి నిజమైన చెల్లింపు జరగదు.",
        "hi": "एक सिम्युलेटेड भुगतान विधि चुनें। कोई वास्तविक भुगतान नहीं किया जाएगा।",
    },
    "shopsphere_review_instruction": {
        "en": "Review your items, delivery option, payment method, and grand total before continuing.",
        "te": "కొనసాగడానికి ముందు మీ వస్తువులు, డెలివరీ ఎంపిక, చెల్లింపు పద్ధతి మరియు మొత్తం మొత్తాన్ని సమీక్షించండి.",
        "hi": "आगे बढ़ने से पहले अपने सामान, डिलीवरी विकल्प, भुगतान विधि और कुल राशि की समीक्षा करें।",
    },
    "shopsphere_demo_payment_instruction": {
        "en": "This is a simulated payment. A test outcome is being randomly selected among success, failure, and pending.",
        "te": "ఇది అనుకరణ చెల్లింపు. విజయం, వైఫల్యం లేదా పెండింగ్‌లలో ఒక ఫలితం యాదృచ్ఛికంగా ఎంపిక చేయబడుతోంది.",
        "hi": "यह एक सिम्युलेटेड भुगतान है। सफलता, विफलता या लंबित में से एक परिणाम यादृच्छिक रूप से चुना जा रहा है।",
    },
    "shopsphere_confirmed_instruction": {
        "en": "Your demonstration order is confirmed. No real purchase was made.",
        "te": "మీ డెమో ఆర్డర్ నిర్ధారించబడింది. నిజమైన కొనుగోలు ఏదీ జరగలేదు.",
        "hi": "आपका प्रदर्शन ऑर्डर कन्फर्म हो गया है। कोई वास्तविक खरीदारी नहीं की गई है।",
    },
    "shopsphere_failed_instruction": {
        "en": "The simulated payment failed. No real payment was made.",
        "te": "సిమ్యులేటెడ్ చెల్లింపు విఫలమైంది. నిజమైన చెల్లింపు ఏదీ జరగలేదు.",
        "hi": "सिम्युलेटेड भुगतान विफल रहा। कोई वास्तविक भुगतान नहीं किया गया।",
    },
    "shopsphere_pending_instruction": {
        "en": "The simulated result is pending. It has not been confirmed.",
        "te": "సిమ్యులేటెడ్ ఫలితం పెండింగ్‌లో ఉంది. ఇది నిర్ధారించబడలేదు.",
        "hi": "सिम्युलेटेड परिणाम लंबित है। इसकी पुष्टि नहीं हुई है।",
    },
    "shopsphere_unconfirmed_instruction": {
        "en": "The demonstration result could not be verified. It has not been marked as successful.",
        "te": "డెమో ఫలితాన్ని ధృవీకరించడం సాధ్యం కాలేదు. ఇది విజయవంతమైనదిగా గుర్తించబడలేదు.",
        "hi": "डेमो परिणाम की पुष्टि नहीं की जा सकी। इसे सफल नहीं माना गया है।",
    },
    "shopsphere_empty_cart_instruction": {
        "en": "Your ShopSphere cart is empty. Add a product to your cart to begin checkout.",
        "te": "మీ షాప్‌స్పియర్ కార్ట్ ఖాళీగా ఉంది. చెక్‌అవుట్ ప్రారంభించడానికి మీ కార్ట్‌కి ఒక ఉత్పత్తిని జోడించండి.",
        "hi": "आपका शॉपस्फीयर कार्ट खाली है। चेकआउट शुरू करने के लिए कार्ट में उत्पाद जोड़ें।",
    },
}

# Force re-generation for these keys to wipe out any legacy "pressure cooker 1499" text
FORCE_REGEN_KEYS = {
    "review_instruction",
    "success_instruction",
    "order_total_spoken",
    "shopsphere_landing_instruction",
    "shopsphere_product_instruction",
    "shopsphere_cart_instruction",
    "shopsphere_address_instruction",
    "shopsphere_delivery_instruction",
    "shopsphere_payment_instruction",
    "shopsphere_review_instruction",
    "shopsphere_demo_payment_instruction",
    "shopsphere_confirmed_instruction",
    "shopsphere_failed_instruction",
    "shopsphere_pending_instruction",
    "shopsphere_unconfirmed_instruction",
    "shopsphere_empty_cart_instruction",
}

async def generate_file(sem: asyncio.Semaphore, lang: str, key: str, text: str, output_path: Path):
    if key not in FORCE_REGEN_KEYS and output_path.exists() and output_path.stat().st_size > 0:
        return

    voice = VOICES[lang]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(str(output_path))
                size = output_path.stat().st_size
                print(f"[{lang}] Generated {key}.mp3 ({size} bytes)")
                return
            except Exception as e:
                if attempt == 2:
                    print(f"[{lang}] Failed {key}.mp3 after 3 attempts: {e}")
                    raise
                await asyncio.sleep(1.5 * (attempt + 1))

async def main():
    base_dir = Path(__file__).resolve().parent.parent / "public" / "audio"
    sem = asyncio.Semaphore(4)
    tasks = []
    
    print(f"Starting audio generation targeting {base_dir}...")
    for key, lang_map in AUDIO_PHRASES.items():
        for lang, text in lang_map.items():
            out_file = base_dir / lang / f"{key}.mp3"
            tasks.append(generate_file(sem, lang, key, text, out_file))
            
    await asyncio.gather(*tasks)
    print(f"Successfully processed all {len(tasks)} audio files across 3 languages!")

if __name__ == "__main__":
    asyncio.run(main())
