import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('missing-env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const names = ['comprobantes', 'firmas'];
for (const name of names) {
  const { error } = await supabase.storage.createBucket(name, { public: false });
  if (error && !String(error.message || '').toLowerCase().includes('already exists')) {
    console.log('create-fail', name, error.message);
    process.exitCode = 1;
  } else if (error) {
    console.log('create-ok', name, '(exists)');
  } else {
    console.log('create-ok', name);
  }
}

const { data, error } = await supabase.storage.listBuckets();
if (error) {
  console.log('list-fail', error.message);
  process.exit(1);
}

console.log('buckets', data.map((b) => b.name).join(','));
