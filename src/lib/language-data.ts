/**
 * Language interface definition following ISO 639 standards
 */
export interface Language {
  id?: string;        // Database ID (optional for compatibility with static data)
  code: string;       // ISO 639-1 two-letter code
  name: string;       // English name of the language
  native?: string;    // Native name of the language
  rtl?: boolean;      // Right-to-left script
  countries?: any[];  // Associated countries (for database version)
}

/**
 * Comprehensive list of world languages following ISO 639-1
 */
export const languages: Language[] = [
  { code: 'ab', name: 'Abkhaz', native: 'аҧсуа' },
  { code: 'aa', name: 'Afar', native: 'Afaraf' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'ak', name: 'Akan', native: 'Akan' },
  { code: 'sq', name: 'Albanian', native: 'Shqip' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'an', name: 'Aragonese', native: 'aragonés' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'av', name: 'Avaric', native: 'авар мацӀ' },
  { code: 'ae', name: 'Avestan', native: 'avesta' },
  { code: 'ay', name: 'Aymara', native: 'aymar aru' },
  { code: 'az', name: 'Azerbaijani', native: 'azərbaycan dili' },
  { code: 'bm', name: 'Bambara', native: 'bamanankan' },
  { code: 'ba', name: 'Bashkir', native: 'башҡорт теле' },
  { code: 'eu', name: 'Basque', native: 'euskara' },
  { code: 'be', name: 'Belarusian', native: 'беларуская мова' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'bi', name: 'Bislama', native: 'Bislama' },
  { code: 'bs', name: 'Bosnian', native: 'bosanski jezik' },
  { code: 'br', name: 'Breton', native: 'brezhoneg' },
  { code: 'bg', name: 'Bulgarian', native: 'български език' },
  { code: 'my', name: 'Burmese', native: 'ဗမာစာ' },
  { code: 'ca', name: 'Catalan', native: 'català' },
  { code: 'ch', name: 'Chamorro', native: 'Chamoru' },
  { code: 'ce', name: 'Chechen', native: 'нохчийн мотт' },
  { code: 'ny', name: 'Chichewa', native: 'chiCheŵa' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'cv', name: 'Chuvash', native: 'чӑваш чӗлхи' },
  { code: 'kw', name: 'Cornish', native: 'Kernewek' },
  { code: 'co', name: 'Corsican', native: 'corsu' },
  { code: 'cr', name: 'Cree', native: 'ᓀᐦᐃᔭᐍᐏᐣ' },
  { code: 'hr', name: 'Croatian', native: 'hrvatski jezik' },
  { code: 'cs', name: 'Czech', native: 'čeština' },
  { code: 'da', name: 'Danish', native: 'dansk' },
  { code: 'dv', name: 'Divehi', native: 'ދިވެހި', rtl: true },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'dz', name: 'Dzongkha', native: 'རྫོང་ཁ' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'eo', name: 'Esperanto', native: 'Esperanto' },
  { code: 'et', name: 'Estonian', native: 'eesti' },
  { code: 'ee', name: 'Ewe', native: 'Eʋegbe' },
  { code: 'fo', name: 'Faroese', native: 'føroyskt' },
  { code: 'fj', name: 'Fijian', native: 'vosa Vakaviti' },
  { code: 'fi', name: 'Finnish', native: 'suomi' },
  { code: 'fr', name: 'French', native: 'français' },
  { code: 'ff', name: 'Fula', native: 'Fulfulde' },
  { code: 'gl', name: 'Galician', native: 'Galego' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'gn', name: 'Guaraní', native: 'Avañe\'ẽ' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ht', name: 'Haitian', native: 'Kreyòl ayisyen' },
  { code: 'ha', name: 'Hausa', native: 'هَوُسَ', rtl: true },
  { code: 'he', name: 'Hebrew', native: 'עברית', rtl: true },
  { code: 'hz', name: 'Herero', native: 'Otjiherero' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ho', name: 'Hiri Motu', native: 'Hiri Motu' },
  { code: 'hu', name: 'Hungarian', native: 'magyar' },
  { code: 'ia', name: 'Interlingua', native: 'Interlingua' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ie', name: 'Interlingue', native: 'Interlingue' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge' },
  { code: 'ig', name: 'Igbo', native: 'Asụsụ Igbo' },
  { code: 'ik', name: 'Inupiaq', native: 'Iñupiaq' },
  { code: 'io', name: 'Ido', native: 'Ido' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'iu', name: 'Inuktitut', native: 'ᐃᓄᒃᑎᑐᑦ' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'jv', name: 'Javanese', native: 'basa Jawa' },
  { code: 'kl', name: 'Kalaallisut', native: 'kalaallisut' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'kr', name: 'Kanuri', native: 'Kanuri' },
  { code: 'ks', name: 'Kashmiri', native: 'कश्मीरी', rtl: true },
  { code: 'kk', name: 'Kazakh', native: 'қазақ тілі' },
  { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ' },
  { code: 'ki', name: 'Kikuyu', native: 'Gĩkũyũ' },
  { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda' },
  { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча' },
  { code: 'kv', name: 'Komi', native: 'коми кыв' },
  { code: 'kg', name: 'Kongo', native: 'Kikongo' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ku', name: 'Kurdish', native: 'Kurdî', rtl: true },
  { code: 'kj', name: 'Kwanyama', native: 'Kuanyama' },
  { code: 'la', name: 'Latin', native: 'latine' },
  { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
  { code: 'lg', name: 'Ganda', native: 'Luganda' },
  { code: 'li', name: 'Limburgish', native: 'Limburgs' },
  { code: 'ln', name: 'Lingala', native: 'Lingála' },
  { code: 'lo', name: 'Lao', native: 'ພາສາລາວ' },
  { code: 'lt', name: 'Lithuanian', native: 'lietuvių kalba' },
  { code: 'lu', name: 'Luba-Katanga', native: 'Kiluba' },
  { code: 'lv', name: 'Latvian', native: 'latviešu valoda' },
  { code: 'gv', name: 'Manx', native: 'Gaelg' },
  { code: 'mk', name: 'Macedonian', native: 'македонски јазик' },
  { code: 'mg', name: 'Malagasy', native: 'fiteny malagasy' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mt', name: 'Maltese', native: 'Malti' },
  { code: 'mi', name: 'Māori', native: 'te reo Māori' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'mh', name: 'Marshallese', native: 'Kajin M̧ajeļ' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол хэл' },
  { code: 'na', name: 'Nauru', native: 'Dorerin Naoero' },
  { code: 'nv', name: 'Navajo', native: 'Diné bizaad' },
  { code: 'nd', name: 'Northern Ndebele', native: 'isiNdebele' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'ng', name: 'Ndonga', native: 'Owambo' },
  { code: 'nb', name: 'Norwegian Bokmål', native: 'Norsk Bokmål' },
  { code: 'nn', name: 'Norwegian Nynorsk', native: 'Norsk Nynorsk' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'ii', name: 'Nuosu', native: 'ꆈꌠ꒿ Nuosuhxop' },
  { code: 'nr', name: 'Southern Ndebele', native: 'isiNdebele' },
  { code: 'oc', name: 'Occitan', native: 'occitan' },
  { code: 'oj', name: 'Ojibwe', native: 'ᐊᓂᔑᓈᐯᒧᐎᓐ' },
  { code: 'om', name: 'Oromo', native: 'Afaan Oromoo' },
  { code: 'or', name: 'Oriya', native: 'ଓଡ଼ିଆ' },
  { code: 'os', name: 'Ossetian', native: 'ирон æвзаг' },
  { code: 'pa', name: 'Panjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'pi', name: 'Pāli', native: 'पाऴि' },
  { code: 'fa', name: 'Persian', native: 'فارسی', rtl: true },
  { code: 'pl', name: 'Polish', native: 'język polski' },
  { code: 'ps', name: 'Pashto', native: 'پښتو', rtl: true },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'qu', name: 'Quechua', native: 'Runa Simi' },
  { code: 'rm', name: 'Romansh', native: 'rumantsch grischun' },
  { code: 'rn', name: 'Kirundi', native: 'Ikirundi' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'sc', name: 'Sardinian', native: 'sardu' },
  { code: 'sd', name: 'Sindhi', native: 'सिन्धी', rtl: true },
  { code: 'se', name: 'Northern Sami', native: 'Davvisámegiella' },
  { code: 'sm', name: 'Samoan', native: 'gagana fa\'a Samoa' },
  { code: 'sg', name: 'Sango', native: 'yângâ tî sängö' },
  { code: 'sr', name: 'Serbian', native: 'српски језик' },
  { code: 'gd', name: 'Scottish Gaelic', native: 'Gàidhlig' },
  { code: 'sn', name: 'Shona', native: 'chiShona' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'sk', name: 'Slovak', native: 'slovenčina' },
  { code: 'sl', name: 'Slovene', native: 'slovenski jezik' },
  { code: 'so', name: 'Somali', native: 'Soomaaliga' },
  { code: 'st', name: 'Southern Sotho', native: 'Sesotho' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'su', name: 'Sundanese', native: 'Basa Sunda' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'ss', name: 'Swati', native: 'SiSwati' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'tg', name: 'Tajik', native: 'тоҷикӣ' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'ti', name: 'Tigrinya', native: 'ትግርኛ' },
  { code: 'bo', name: 'Tibetan', native: 'བོད་ཡིག' },
  { code: 'tk', name: 'Turkmen', native: 'Türkmençe' },
  { code: 'tl', name: 'Tagalog', native: 'Wikang Tagalog' },
  { code: 'tn', name: 'Tswana', native: 'Setswana' },
  { code: 'to', name: 'Tonga', native: 'faka Tonga' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'ts', name: 'Tsonga', native: 'Xitsonga' },
  { code: 'tt', name: 'Tatar', native: 'татар теле' },
  { code: 'tw', name: 'Twi', native: 'Twi' },
  { code: 'ty', name: 'Tahitian', native: 'Reo Tahiti' },
  { code: 'ug', name: 'Uyghur', native: 'ئۇيغۇرچە', rtl: true },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'uz', name: 'Uzbek', native: 'Ўзбек' },
  { code: 've', name: 'Venda', native: 'Tshivenḓa' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'vo', name: 'Volapük', native: 'Volapük' },
  { code: 'wa', name: 'Walloon', native: 'Walon' },
  { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
  { code: 'wo', name: 'Wolof', native: 'Wollof' },
  { code: 'fy', name: 'Western Frisian', native: 'Frysk' },
  { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
  { code: 'yi', name: 'Yiddish', native: 'ייִדיש', rtl: true },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'za', name: 'Zhuang', native: 'Saɯ cueŋƅ' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' }
];
