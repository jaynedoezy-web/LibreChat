import { atom } from 'recoil';
import { logger } from '~/utils';
export const artifactsState = atom({
    key: 'artifactsState',
    default: null,
    effects: [
        ({ onSet, node }) => {
            onSet(async (newValue) => {
                logger.log('artifacts', 'Recoil Effect: Setting artifactsState', {
                    key: node.key,
                    newValue,
                });
            });
        },
    ],
});
export const currentArtifactId = atom({
    key: 'currentArtifactId',
    default: null,
    effects: [
        ({ onSet, node }) => {
            onSet(async (newValue) => {
                logger.log('artifacts', 'Recoil Effect: Setting currentArtifactId', {
                    key: node.key,
                    newValue,
                });
            });
        },
    ],
});
export const artifactsVisibility = atom({
    key: 'artifactsVisibility',
    default: true,
    effects: [
        ({ onSet, node }) => {
            onSet(async (newValue) => {
                logger.log('artifacts', 'Recoil Effect: Setting artifactsVisibility', {
                    key: node.key,
                    newValue,
                });
            });
        },
    ],
});
export const visibleArtifacts = atom({
    key: 'visibleArtifacts',
    default: null,
    effects: [
        ({ onSet, node }) => {
            onSet(async (newValue) => {
                logger.log('artifacts', 'Recoil Effect: Setting `visibleArtifacts`', {
                    key: node.key,
                    newValue,
                });
            });
        },
    ],
});
