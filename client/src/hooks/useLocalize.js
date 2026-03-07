import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { useTranslation } from 'react-i18next';
import store from '~/store';
export default function useLocalize() {
    const lang = useRecoilValue(store.lang);
    const { t, i18n } = useTranslation();
    useEffect(() => {
        if (i18n.language !== lang) {
            i18n.changeLanguage(lang);
        }
    }, [lang, i18n]);
    return (phraseKey, options) => t(phraseKey, options);
}
