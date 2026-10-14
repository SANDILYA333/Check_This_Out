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
        "en": "Review your order for the pressure cooker with total amount of one thousand four hundred ninety-nine rupees. Then click confirm order.",
        "te": "ప్రెషర్ కుక్కర్ కోసం మొత్తం వెయ్యి నాలుగు వందల తొంభై తొమ్మిది రూపాయల ఆర్డర్‌ను సమీక్షించండి. తర్వాత కన్ఫర్మ్ ఆర్డర్ క్లిక్ చేయండి.",
        "hi": "प्रेशर कुकर के लिए कुल एक हज़ार चार सौ निन्यानवे रुपये के ऑर्डर की समीक्षा करें। फिर कन्फर्म ऑर्डर पर क्लिक करें।",
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
        "en": "Simulated payment successful! Your demo order for the pressure cooker has been placed.",
        "te": "అనుకరణ చెల్లింపు విజయవంతమైంది! ప్రెషర్ కుక్కర్ కోసం మీ డెమో ఆర్డర్ పూర్తయింది.",
        "hi": "सिम्युलेटेड भुगतान सफल रहा! प्रेशर कुकर के लिए आपका डेमो ऑर्डर पूरा हो गया है।",
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

    # Fixed Spoken Price Wording
    "order_total_spoken": {
        "en": "Total amount is one thousand four hundred ninety-nine rupees.",
        "te": "మొత్తం వెయ్యి నాలుగు వందల తొంభై తొమ్మిది రూపాయలు.",
        "hi": "कुल राशि एक हज़ार चार सौ निन्यानवे रुपये है।",
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
}

async def generate_file(sem: asyncio.Semaphore, lang: str, key: str, text: str, output_path: Path):
    if output_path.exists() and output_path.stat().st_size > 0:
        print(f"[{lang}] Skipping existing {key}.mp3 ({output_path.stat().st_size} bytes)")
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
    sem = asyncio.Semaphore(2)
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
