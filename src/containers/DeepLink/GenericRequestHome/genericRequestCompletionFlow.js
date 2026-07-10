export const GENERIC_REQUEST_COMPLETION_ACTIONS = {
  WAIT: 'wait',
  PROCESS_NEXT_DETAIL: 'process-next-detail',
  RUN_AUTO_DELIVERY: 'run-auto-delivery',
  SHOW_LEGACY_COMPLETION: 'show-legacy-completion',
};

const IDLE_DELIVERY_STATUS = 'idle';

export const alignGenericResponseNetwork = (request, response) => {
  if (request.isTestnet()) {
    response.setIsTestnet();
  }

  return response;
};

export const createGenericRequestDeliverySingleFlight = () => {
  let inFlight = false;

  return {
    tryStart: () => {
      if (inFlight) return false;

      inFlight = true;
      return true;
    },
    clear: () => {
      inFlight = false;
    },
  };
};

export const getGenericRequestCompletionAction = ({
  autoDeliveryRequested,
  autoDeliveryStatus,
  detailCount,
  detailsProcessed,
  inlineDeliveryInProgress,
}) => {
  if (inlineDeliveryInProgress || detailsProcessed < 0) {
    return GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT;
  }

  if (detailsProcessed < detailCount) {
    return GENERIC_REQUEST_COMPLETION_ACTIONS.PROCESS_NEXT_DETAIL;
  }

  if (autoDeliveryRequested) {
    return autoDeliveryStatus === IDLE_DELIVERY_STATUS
      ? GENERIC_REQUEST_COMPLETION_ACTIONS.RUN_AUTO_DELIVERY
      : GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT;
  }

  return GENERIC_REQUEST_COMPLETION_ACTIONS.SHOW_LEGACY_COMPLETION;
};
