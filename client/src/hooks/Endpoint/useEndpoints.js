import React, { useMemo, useCallback } from 'react';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import { Permissions, alternateName, EModelEndpoint, PermissionTypes, getEndpointField, } from 'librechat-data-provider';
import { useGetEndpointsQuery } from '~/data-provider';
import { mapEndpoints, getIconKey } from '~/utils';
import { useHasAccess } from '~/hooks';
import { icons } from './Icons';
export const useEndpoints = ({ agents, assistantsMap, endpointsConfig, startupConfig, }) => {
    const modelsQuery = useGetModelsQuery();
    const { data: endpoints = [] } = useGetEndpointsQuery({ select: mapEndpoints });
    const interfaceConfig = startupConfig?.interface ?? {};
    const includedEndpoints = useMemo(() => new Set(startupConfig?.modelSpecs?.addedEndpoints ?? []), [startupConfig?.modelSpecs?.addedEndpoints]);
    const hasAgentAccess = useHasAccess({
        permissionType: PermissionTypes.AGENTS,
        permission: Permissions.USE,
    });
    const assistants = useMemo(() => Object.values(assistantsMap?.[EModelEndpoint.assistants] ?? {}), [assistantsMap]);
    const azureAssistants = useMemo(() => Object.values(assistantsMap?.[EModelEndpoint.azureAssistants] ?? {}), [assistantsMap]);
    const filteredEndpoints = useMemo(() => {
        if (!interfaceConfig.modelSelect) {
            return [];
        }
        const result = [];
        for (let i = 0; i < endpoints.length; i++) {
            if (endpoints[i] === EModelEndpoint.agents && !hasAgentAccess) {
                continue;
            }
            if (includedEndpoints.size > 0 && !includedEndpoints.has(endpoints[i])) {
                continue;
            }
            result.push(endpoints[i]);
        }
        return result;
    }, [endpoints, hasAgentAccess, includedEndpoints, interfaceConfig.modelSelect]);
    const endpointRequiresUserKey = useCallback((ep) => {
        return !!getEndpointField(endpointsConfig, ep, 'userProvide');
    }, [endpointsConfig]);
    const mappedEndpoints = useMemo(() => {
        return filteredEndpoints.map((ep) => {
            const endpointType = getEndpointField(endpointsConfig, ep, 'type');
            const iconKey = getIconKey({ endpoint: ep, endpointsConfig, endpointType });
            const Icon = icons[iconKey];
            const endpointIconURL = getEndpointField(endpointsConfig, ep, 'iconURL');
            const hasModels = (ep === EModelEndpoint.agents && (agents?.length ?? 0) > 0) ||
                (ep === EModelEndpoint.assistants && assistants?.length > 0) ||
                (ep !== EModelEndpoint.assistants &&
                    ep !== EModelEndpoint.agents &&
                    (modelsQuery.data?.[ep]?.length ?? 0) > 0);
            // Base result object with formatted default icon
            const result = {
                value: ep,
                label: alternateName[ep] || ep,
                hasModels,
                icon: Icon
                    ? React.createElement(Icon, {
                        size: 20,
                        className: 'text-text-primary shrink-0 icon-md',
                        iconURL: endpointIconURL,
                        endpoint: ep,
                    })
                    : null,
            };
            // Handle agents case
            if (ep === EModelEndpoint.agents && (agents?.length ?? 0) > 0) {
                result.models = agents?.map((agent) => ({
                    name: agent.id,
                    isGlobal: agent.isPublic ?? false,
                }));
                result.agentNames = agents?.reduce((acc, agent) => {
                    acc[agent.id] = agent.name || '';
                    return acc;
                }, {});
                result.modelIcons = agents?.reduce((acc, agent) => {
                    acc[agent.id] = agent?.avatar?.filepath;
                    return acc;
                }, {});
            }
            // Handle assistants case
            else if (ep === EModelEndpoint.assistants && assistants.length > 0) {
                result.models = assistants.map((assistant) => ({
                    name: assistant.id,
                    isGlobal: false,
                }));
                result.assistantNames = assistants.reduce((acc, assistant) => {
                    acc[assistant.id] = assistant.name || '';
                    return acc;
                }, {});
                result.modelIcons = assistants.reduce((acc, assistant) => {
                    acc[assistant.id] = assistant.metadata?.avatar;
                    return acc;
                }, {});
            }
            else if (ep === EModelEndpoint.azureAssistants && azureAssistants.length > 0) {
                result.models = azureAssistants.map((assistant) => ({
                    name: assistant.id,
                    isGlobal: false,
                }));
                result.assistantNames = azureAssistants.reduce((acc, assistant) => {
                    acc[assistant.id] = assistant.name || '';
                    return acc;
                }, {});
                result.modelIcons = azureAssistants.reduce((acc, assistant) => {
                    acc[assistant.id] = assistant.metadata?.avatar;
                    return acc;
                }, {});
            }
            // For other endpoints with models from the modelsQuery
            else if (ep !== EModelEndpoint.agents &&
                ep !== EModelEndpoint.assistants &&
                (modelsQuery.data?.[ep]?.length ?? 0) > 0) {
                result.models = modelsQuery.data?.[ep]?.map((model) => ({
                    name: model,
                    isGlobal: false,
                }));
            }
            return result;
        });
    }, [filteredEndpoints, endpointsConfig, modelsQuery.data, agents, assistants, azureAssistants]);
    return {
        mappedEndpoints,
        endpointRequiresUserKey,
    };
};
export default useEndpoints;
