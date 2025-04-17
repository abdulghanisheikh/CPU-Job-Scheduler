// script.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('scheduler-form');
    const pcInput = document.getElementById('process-count');
    const procContainer = document.getElementById('processes-container');
  
    // dynamically add process input lines
    pcInput.addEventListener('change', () => {
      procContainer.innerHTML = '';
      const n = parseInt(pcInput.value) || 0;
      for (let i = 1; i <= n; i++) {
        const line = document.createElement('div');
        line.className = 'process-line';
        line.innerHTML = `
          <input type="text" placeholder="Name (e.g. P${i})" data-field="name" required />
          <input type="number" placeholder="Arrival" data-field="arrival" min="0" required />
          <input type="number" placeholder="Service" data-field="burst" min="1" required />
        `;
        procContainer.appendChild(line);
      }
    });
  
    form.addEventListener('submit', e => {
      e.preventDefault();
      const op = document.getElementById('operation').value;
      const algo = document.getElementById('algorithm').value;
      const quantum = parseInt(document.getElementById('quantum').value) || 1;
      const last = parseInt(document.getElementById('last-instant').value);
      const processes = Array.from(procContainer.children).map(div => {
        const name = div.querySelector('[data-field="name"]').value.trim();
        const arrival = parseInt(div.querySelector('[data-field="arrival"]').value);
        const burst = parseInt(div.querySelector('[data-field="burst"]').value);
        return { id: name, arrival, burst };
      });
      let schedule;
      switch (algo) {
        case 'fcfs': schedule = fcfs(processes, last); break;
        case 'rr':   schedule = roundRobin(processes, quantum, last); break;
        case 'sjf':  schedule = shortestJobFirst(processes, last); break;
      }
      if (op === 'trace') renderTrace(schedule, processes, last);
      else renderStats(schedule, processes, last);
    });
  });
  
  // FCFS
  function fcfs(proc, last) {
  const p = [...proc].sort((a, b) => a.arrival - b.arrival); //0(nlogn)
  let t = 0;
  const timeline = [];
  for (const pr of p) {
    while (t < pr.arrival && t < last) {
      timeline.push({ time: t, id: null }); // null = idle
      t++;
    }
    for (let i = 0; i < pr.burst && t < last; i++) {
      timeline.push({ time: t, id: pr.id });
      t++;
    }
  }
  while (t <= last) {
    timeline.push({ time: t, id: null });
    t++;
  }
  return timeline;
  }
  
  // Round Robin
  function roundRobin(proc, q, last) {
      const map = new Map(proc.map(p => [p.id, { ...p, rem: p.burst }]));
      let t = 0, timeline = [], queue = [];
      while (t < last && (queue.length || map.size)) {
        proc.forEach(p => {
          if (p.arrival <= t && map.has(p.id) && !queue.includes(p.id)) {
            queue.push(p.id);
          }
        });
        if (!queue.length) {
          t++;
          continue;
        }
        const id = queue.shift();
        const pr = map.get(id);
        const run = Math.min(q, pr.rem);
        for (let i = 0; i < run; i++) {
          timeline.push({ time: t + i, id });
          const currentTime = t + i + 1;
          proc.forEach(p => {
            if (p.arrival === currentTime && map.has(p.id) && !queue.includes(p.id) && p.id !== id) {
              queue.push(p.id);
            }
          });
        }   
        t += run;
        pr.rem -= run;
        if (pr.rem > 0) {
          queue.push(id);
        } else {
          map.delete(id);
        }
      }
      return timeline;
  }
  
  // SPN (non-preemptive)
  function shortestJobFirst(proc, last) {
      const map = new Map(proc.map(p => [p.id, { ...p }]));
      let t = 0;                    
      const timeline = []; // timeline{time,pid}
      while (map.size > 0) {
        const available = Array.from(map.values()).filter(p => p.arrival <= t);
        if (available.length === 0) {
          t++;
          continue;
        }
        available.sort((a, b) => a.burst - b.burst);
        const pr = available[0];
        for (let i = 0; i < pr.burst; i++) {
          timeline.push({ time: t + i, id: pr.id });
        }
        t += pr.burst;        
        map.delete(pr.id); 
      }
      return timeline;
    }
  
  // Render Gantt Chart
  function renderTrace(tl, procs, last) {
    const container = document.getElementById('gantt');
    container.innerHTML = '';
    procs.forEach(p => {
      const row = document.createElement('div');
      row.className = 'gantt-row';
      const label = document.createElement('div');
      label.className = 'gantt-label';
      label.textContent = p.id;
      row.appendChild(label);
  
      for (let time = 0; time <= last; time++) {
        const cell = document.createElement('div');
        cell.className = 'gantt-cell';
        cell.style.animationDelay = `${time * 100}ms`; // Animate in order
        cell.setAttribute('data-tooltip', `Time: ${time}`);
  
        const seg = tl.find(s => s.time === time && s.id === p.id);
        if (seg) {
          cell.classList.add('exec');
          cell.textContent = '⚙';
          cell.setAttribute('data-tooltip', `Process: ${p.id} @ ${time}`);
        } else if (time >= p.arrival) {
          cell.classList.add('wait');
          cell.textContent = '⏳';
        }
        row.appendChild(cell);
      }
      container.appendChild(row);
    });
  }
  
  
  // Render Statistics
  function renderStats(tl, procs, last) {
    const statsDiv = document.getElementById('statistics');
    statsDiv.innerHTML = '';
    const endTimes = {}, startTimes={};
    tl.forEach(seg=>{
      if (startTimes[seg.id]===undefined) startTimes[seg.id]=seg.time;
      endTimes[seg.id]=seg.time+1;
    });
    let html = `<table><tr><th>Process</th><th>Turnaround</th><th>Waiting</th></tr>`;
    procs.forEach(p=>{
      const tat = endTimes[p.id] - p.arrival;
      const wt = tat - p.burst;
      html += `<tr><td>${p.id}</td><td>${tat}</td><td>${wt}</td></tr>`;
    });
    html += '</table>';
    statsDiv.innerHTML = html;
  }