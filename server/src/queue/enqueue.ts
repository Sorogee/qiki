import { EmailQueue, NotifyQueue, EmailJob, NotifyJob } from './queues.js';
import { SearchQueue, SearchIndexJob } from './search.js';

export async function enqueueEmail(job: EmailJob) {
  try { await (EmailQueue as any).add('send', job, { removeOnComplete: true, attempts: 3 }); }
  catch (e) { console.error('enqueueEmail failed', e); }
}

export async function enqueueNotify(job: NotifyJob) {
  try { await (NotifyQueue as any).add('notify', job, { removeOnComplete: true, attempts: 3 }); }
  catch (e) { console.error('enqueueNotify failed', e); }
}

export async function enqueueSearch(job: SearchIndexJob) {
  try { await (SearchQueue as any).add('index', job, { attempts: 3, removeOnComplete: true, removeOnFail: 20 }); }
  catch (e) { console.error('enqueueSearch failed', e); }
}
