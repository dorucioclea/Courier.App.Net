﻿using System.Threading.Tasks;
using Convey.CQRS.Events;
using SwiftParcel.Services.Orders.Application.Exceptions;
using SwiftParcel.Services.Orders.Core.Repositories;
using SwiftParcel.Services.Orders.Application.Services;

namespace SwiftParcel.Services.Orders.Application.Events.External.Handlers
{
    public class DeliveryCompletedHandler : IEventHandler<DeliveryCompleted>
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IMessageBroker _messageBroker;
        private readonly IEventMapper _eventMapper;

        public DeliveryCompletedHandler(IOrderRepository orderRepository, IMessageBroker messageBroker,
            IEventMapper eventMapper)
        {
            _orderRepository = orderRepository;
            _messageBroker = messageBroker;
            _eventMapper = eventMapper;
        }

        public async Task HandleAsync(DeliveryCompleted @event, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetAsync(@event.OrderId);
            if (order is null)
            {
                throw new OrderNotFoundException(@event.OrderId);
            }

            order.Deliver(@event.DateTime);
            await _orderRepository.UpdateAsync(order);
            var events = _eventMapper.MapAll(order.Events);
            await _messageBroker.PublishAsync(events.ToArray());
        }
    }
}