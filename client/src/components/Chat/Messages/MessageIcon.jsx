import React, { useMemo, memo } from 'react';
import { EModelEndpoint, getEndpointField } from 'librechat-data-provider';
import ConvoIconURL from '~/components/Endpoints/ConvoIconURL';
import { useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, logger } from '~/utils';
import Icon from '~/components/Endpoints/Icon';
const agentAnimationStyles = ['breathe', 'bob', 'shimmer'];
const AGENT_MODEL_PREFIX = 'agent_';
function getStyleFromSeed(seed) {
  if (!seed) {
    return undefined;
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return agentAnimationStyles[hash % agentAnimationStyles.length];
}
const MessageIcon = memo(({ iconData, assistant, agent, isActive = false }) => {
  logger.log('icon_data', iconData, assistant, agent);
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const agentName = useMemo(() => agent?.name ?? '', [agent]);
  const agentAvatar = useMemo(() => agent?.avatar?.filepath ?? '', [agent]);
  const assistantName = useMemo(() => assistant?.name ?? '', [assistant]);
  const assistantAvatar = useMemo(() => assistant?.metadata?.avatar ?? '', [assistant]);
  const avatarURL = useMemo(() => {
    let result = '';
    if (assistant) {
      result = assistantAvatar;
    } else if (agent) {
      result = agentAvatar;
    }
    return result;
  }, [assistant, agent, assistantAvatar, agentAvatar]);
  const iconURL = iconData?.iconURL;
  const endpoint = useMemo(
    () => getIconEndpoint({ endpointsConfig, iconURL, endpoint: iconData?.endpoint }),
    [endpointsConfig, iconURL, iconData?.endpoint],
  );
  const endpointIconURL = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'iconURL'),
    [endpointsConfig, endpoint],
  );
  const isAgentMessage = useMemo(() => {
    const model = iconData?.model ?? '';
    return (
      agent != null ||
      iconData?.endpoint === EModelEndpoint.agents ||
      model.startsWith(AGENT_MODEL_PREFIX)
    );
  }, [agent, iconData?.endpoint, iconData?.model]);
  const agentAnimationStyle = useMemo(() => {
    if (!isAgentMessage) {
      return undefined;
    }
    const model = iconData?.model ?? '';
    const seed = agent
      ? `${agent.id ?? ''}:${agent.name ?? ''}`
      : ((model || iconData?.modelLabel) ?? '');
    return getStyleFromSeed(seed);
  }, [agent, iconData?.model, iconData?.modelLabel, isAgentMessage]);
  const showActivity = useMemo(() => isActive && isAgentMessage, [isActive, isAgentMessage]);
  if (iconData?.isCreatedByUser !== true && iconURL != null && iconURL.includes('http')) {
    return (
      <ConvoIconURL
        iconURL={iconURL}
        isActive={showActivity}
        agentAnimationStyle={agentAnimationStyle}
        modelLabel={iconData?.modelLabel}
        context="message"
        assistantAvatar={assistantAvatar}
        agentAvatar={agentAvatar}
        endpointIconURL={endpointIconURL}
        assistantName={assistantName}
        agentName={agentName}
      />
    );
  }
  return (
    <Icon
      isCreatedByUser={iconData?.isCreatedByUser ?? false}
      endpoint={endpoint}
      iconURL={avatarURL || endpointIconURL}
      isActive={showActivity}
      agentAnimationStyle={agentAnimationStyle}
      model={iconData?.model}
      assistantName={assistantName}
      agentName={agentName || (isAgentMessage ? (iconData?.modelLabel ?? '') : '')}
      size={28.8}
    />
  );
});
MessageIcon.displayName = 'MessageIcon';
export default MessageIcon;
