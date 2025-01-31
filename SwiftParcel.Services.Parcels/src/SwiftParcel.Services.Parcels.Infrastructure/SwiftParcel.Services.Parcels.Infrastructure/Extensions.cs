using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Convey;
using Convey.CQRS.Commands;
using Convey.CQRS.Events;
using Convey.CQRS.Queries;
using Convey.Discovery.Consul;
using Convey.Docs.Swagger;
using Convey.HTTP;
using Convey.LoadBalancing.Fabio;
using Convey.MessageBrokers;
using Convey.MessageBrokers.CQRS;
using Convey.MessageBrokers.Outbox;
using Convey.MessageBrokers.Outbox.Mongo;
using Convey.MessageBrokers.RabbitMQ;
using Convey.Metrics.AppMetrics;
using Convey.Persistence.MongoDB;
using Convey.Persistence.Redis;
using Convey.Security;
using Convey.Tracing.Jaeger;
using Convey.Tracing.Jaeger.RabbitMQ;
using Convey.WebApi;
using Convey.WebApi.CQRS;
using Convey.WebApi.Swagger;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using SwiftParcel.Services.Parcels.Application;
using SwiftParcel.Services.Parcels.Application.Commands;
using SwiftParcel.Services.Parcels.Application.Events.External;
using SwiftParcel.Services.Parcels.Application.Services;
using SwiftParcel.Services.Parcels.Core.Repositories;
using SwiftParcel.Services.Parcels.Infrastructure.Contexts;
using SwiftParcel.Services.Parcels.Infrastructure.Decorators;
using SwiftParcel.Services.Parcels.Infrastructure.Exceptions;
using SwiftParcel.Services.Parcels.Infrastructure.Logging;
using SwiftParcel.Services.Parcels.Infrastructure.Mongo.Documents;
using SwiftParcel.Services.Parcels.Infrastructure.Mongo.Repositories;
using SwiftParcel.Services.Parcels.Infrastructure.Services;
using SwiftParcel.Services.Parcels.Application.Services.Clients;
using SwiftParcel.Services.Parcels.Infrastructure.Services.Clients;


namespace SwiftParcel.Services.Parcels.Infrastructure
{
    public static class Extensions
    { 
        public static IConveyBuilder AddInfrastructure(this IConveyBuilder builder)
        {
            builder.Services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
            builder.Services.AddTransient<ICustomerRepository, CustomerMongoRepository>();
            builder.Services.AddTransient<IParcelRepository, ParcelMongoRepository>();
            builder.Services.AddTransient<IAppContextFactory, AppContextFactory>();
            builder.Services.AddTransient<IMessageBroker, MessageBroker>();
            builder.Services.AddTransient<IPricingServiceClient, PricingServiceClient>();
            builder.Services.AddTransient<ILecturerApiServiceClient, LecturerApiServiceClient>();
            builder.Services.AddTransient<IBaronomatApiServiceClient, BaronomatApiServiceClient>();
            builder.Services.AddTransient(ctx => ctx.GetRequiredService<IAppContextFactory>().Create());
            builder.Services.TryDecorate(typeof(ICommandHandler<>), typeof(OutboxCommandHandlerDecorator<>));
            builder.Services.TryDecorate(typeof(IEventHandler<>), typeof(OutboxEventHandlerDecorator<>));

            return builder
                .AddErrorHandler<ExceptionToResponseMapper>()
                .AddQueryHandlers()
                .AddInMemoryQueryDispatcher()
                .AddHttpClient()
                .AddConsul()
                .AddFabio()
                .AddRabbitMq(plugins: p => p.AddJaegerRabbitMqPlugin())
                .AddMessageOutbox(o => o.AddMongo())
                .AddExceptionToMessageMapper<ExceptionToMessageMapper>()
                .AddMongo()
                .AddRedis()
                .AddMetrics()
                .AddJaeger()
                .AddMongo()
                .AddHandlersLogging()
                .AddMongoRepository<CustomerDocument, Guid>("customers")
                .AddMongoRepository<ParcelDocument, Guid>("parcels")
                .AddWebApiSwaggerDocs()
                .AddSecurity();
        }

        public static IApplicationBuilder UseInfrastructure(this IApplicationBuilder app)
        {
            app.UseErrorHandler()
                .UseSwaggerDocs()
                .UseJaeger()
                .UseConvey()
                .UsePublicContracts<ContractAttribute>()
                .UseMetrics()
                .UseRabbitMq()
                .SubscribeCommand<AddParcel>()
                .SubscribeCommand<DeleteParcel>()
                .SubscribeEvent<CustomerCreated>();

            return app;
        }

        internal static CorrelationContext GetCorrelationContext(this IHttpContextAccessor accessor)
            => accessor.HttpContext?.Request.Headers.TryGetValue("Correlation-Context", out var json) is true
                ? JsonConvert.DeserializeObject<CorrelationContext>(json.FirstOrDefault())
                : null;
        
        internal static IDictionary<string, object> GetHeadersToForward(this IMessageProperties messageProperties)
        {
            const string sagaHeader = "Saga";
            if (messageProperties?.Headers is null || !messageProperties.Headers.TryGetValue(sagaHeader, out var saga))
            {
                return null;
            }

            return saga is null
                ? null
                : new Dictionary<string, object>
                {
                    [sagaHeader] = saga
                };
        }
        
        internal static string GetSpanContext(this IMessageProperties messageProperties, string header)
        {
            if (messageProperties is null)
            {
                return string.Empty;
            }

            if (messageProperties.Headers.TryGetValue(header, out var span) && span is byte[] spanBytes)
            {
                return Encoding.UTF8.GetString(spanBytes);
            }

            return string.Empty;
        }
    }
        
}
