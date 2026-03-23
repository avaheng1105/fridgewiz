const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://mmzmyuadzeirolzehdit.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tem15dWFkemVpcm9semVoZGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDQ5NDIsImV4cCI6MjA4OTU4MDk0Mn0.qgRnzfFyxuIzUBTq7JSkzmHDC6LA93IUsHTMPTtUK6Y');

async function test() {
  const { data, error } = await supabase.from('inventory').insert([{ item_name: 'test diagnostic', quantity: 1, unit: 'pieces', category: 'Pantry' }]).select();
  console.log('Inventory Insert result:', JSON.stringify({data, error}, null, 2));
}
test();
