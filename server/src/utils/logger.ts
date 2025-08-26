import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) { return { level: label }; }
  },
  base: undefined,
  hooks: {
    logMethod (args, method) {
      const span = trace.getSpan(context.active());
      if (span) {
        const ctx = span.spanContext();
        args[0] = Object.assign({ trace_id: ctx.traceId, span_id: ctx.spanId }, args[0]);
      }
      method.apply(this, args);
    }
  }
});
