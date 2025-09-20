const $ = (id) => document.getElementById(id);

// Create a poll
const createBtn = document.getElementById('createBtn');
if (createBtn) {
  createBtn.onclick = async () => {
    const questionEl = document.getElementById('q');
    const optsEl = document.getElementById('opts');
    const msg = document.getElementById('createMsg');
    const question = questionEl?.value.trim();
    const options = (optsEl?.value || '').split(',').map(s => s.trim()).filter(Boolean);
    msg.textContent = '';

    if (!question || options.length < 2) {
      msg.textContent = 'Enter a question and at least two options.';
      return;
    }
    try {
      const r = await fetch('/api/v1/polls', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({question, options})
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to create poll');
      msg.textContent = `✅ Poll created with ID: ${data.pollId}`;
      const pollIdInput = document.getElementById('pollId');
      if (pollIdInput) pollIdInput.value = data.pollId;
    } catch (e) {
      msg.textContent = `❌ ${e.message}`;
    }
  };
}

// Load a poll
const loadBtn = document.getElementById('loadBtn');
if (loadBtn) {
  loadBtn.onclick = async () => {
    const id = Number(document.getElementById('pollId')?.value);
    const voteMsg = document.getElementById('voteMsg');
    voteMsg.textContent = '';
    if (!id) return;

    try {
      const r = await fetch(`/api/v1/polls/${id}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Not found');

      const area = document.getElementById('pollArea');
      const q = document.getElementById('pollQuestion');
      const wrap = document.getElementById('options');
      if (area) area.classList.remove('hidden');
      if (q) q.textContent = data.question;
      if (wrap) {
        wrap.innerHTML = '';
        data.options.forEach(o => {
          const div = document.createElement('div'); div.className='option';
          const btn = document.createElement('button'); btn.textContent='Vote';
          btn.onclick = () => vote(id, o.id);
          const span = document.createElement('span'); span.textContent = o.text;
          div.append(btn, span); wrap.appendChild(div);
        });
      }
    } catch (e) {
      voteMsg.textContent = `❌ ${e.message}`;
    }
  };
}

// Vote
async function vote(pollId, optionId){
  const voteMsg = document.getElementById('voteMsg');
  voteMsg.textContent = '';
  try{
    const r = await fetch(`/api/v1/polls/${pollId}/vote`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ optionId })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to vote');
    voteMsg.textContent = '✅ Vote recorded!';
    refreshResults();
  }catch(e){
    voteMsg.textContent = `❌ ${e.message}`;
  }
}

// Results
const refreshResultsBtn = document.getElementById('refreshResultsBtn');
if (refreshResultsBtn) refreshResultsBtn.onclick = refreshResults;

async function refreshResults(){
  const id = Number(document.getElementById('pollId')?.value);
  const box = document.getElementById('results');
  if (!id || !box) return;
  box.innerHTML = '';

  try{
    const r = await fetch(`/api/v1/results/${id}/summary`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to load results');

    const h = document.createElement('h3');
    h.textContent = `Results: ${data.question} (${data.totalVotes} votes)`;
    box.appendChild(h);

    data.totals.forEach(t=>{
      const row=document.createElement('div'); row.style.margin='8px 0';
      const label=document.createElement('div'); label.textContent=`${t.option} — ${t.count} (${t.pct}%)`;
      const prog=document.createElement('div'); prog.className='progress';
      const bar=document.createElement('div'); bar.className='bar'; bar.style.width=`${t.pct}%`;
      prog.appendChild(bar); row.append(label, prog); box.appendChild(row);
    });
  }catch(e){
    box.textContent = `❌ ${e.message}`;
  }
}
