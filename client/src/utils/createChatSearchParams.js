import { isAgentsEndpoint, tQueryParamsSchema, isAssistantsEndpoint, } from 'librechat-data-provider';
import { isEphemeralAgent } from '~/common';
const allowedParams = Object.keys(tQueryParamsSchema.shape);
export default function createChatSearchParams(input) {
    if (input == null) {
        return new URLSearchParams();
    }
    const params = new URLSearchParams();
    if (input && typeof input === 'object' && !('endpoint' in input) && !('model' in input)) {
        Object.entries(input).forEach(([key, value]) => {
            if (value != null && allowedParams.includes(key)) {
                params.set(key, value);
            }
        });
        return params;
    }
    const conversation = input;
    const endpoint = conversation.endpoint;
    if (conversation.spec) {
        return new URLSearchParams({ spec: conversation.spec });
    }
    if (isAgentsEndpoint(endpoint) &&
        conversation.agent_id &&
        !isEphemeralAgent(conversation.agent_id)) {
        return new URLSearchParams({ agent_id: String(conversation.agent_id) });
    }
    else if (isAssistantsEndpoint(endpoint) && conversation.assistant_id) {
        return new URLSearchParams({ assistant_id: String(conversation.assistant_id) });
    }
    else if (isAgentsEndpoint(endpoint) && !conversation.agent_id) {
        return params;
    }
    else if (isAssistantsEndpoint(endpoint) && !conversation.assistant_id) {
        return params;
    }
    if (endpoint) {
        params.set('endpoint', endpoint);
    }
    if (conversation.model) {
        params.set('model', conversation.model);
    }
    const paramMap = {};
    allowedParams.forEach((key) => {
        if (key === 'agent_id' && isEphemeralAgent(conversation.agent_id)) {
            return;
        }
        if (key !== 'endpoint' && key !== 'model') {
            paramMap[key] = conversation[key];
        }
    });
    return Object.entries(paramMap).reduce((params, [key, value]) => {
        if (value != null) {
            if (Array.isArray(value)) {
                params.set(key, key === 'stop' ? value.join(',') : JSON.stringify(value));
            }
            else {
                params.set(key, String(value));
            }
        }
        return params;
    }, params);
}
