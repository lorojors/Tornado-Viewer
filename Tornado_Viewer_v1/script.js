const EF_COLORS={0:'#4caf50',1:'#80ecf1',2:'#eeff00',3:'#f4a836',4:'#b02727',5:'#fa01d0'};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function getEfColor(ef){return EF_COLORS[ef]??'#7a9ab8';}

// Column aliases — supports NOAA SPC format (om,mag,slat,slon,elat,elon,loss,inj,fat,len,wid)
// AND generic formats (tornado_id, ef_scale, start_lat, etc.)
const COL_ALIASES={
  id:           ['om','tornado_id','id','event_id','stormid'],
  date:         ['date','event_date','begin_date','datetime'],
  time:         ['time','begin_time','event_time'],
  mo:           ['mo','month'],
  state:        ['st','state'],
  county:       ['county','cz_name','countyname'],
  start_lat:    ['slat','start_lat','begin_lat','lat','latitude'],
  start_lon:    ['slon','start_lon','begin_lon','lon','longitude','lng'],
  end_lat:      ['elat','end_lat','end_latitude'],
  end_lon:      ['elon','end_lon','end_longitude','end_lng'],
  ef_scale:     ['mag','ef_scale','f_scale','magnitude','ef','f'],
  length_miles: ['len','length_miles','path_length','length'],
  width_yards:  ['wid','width_yards','path_width','width'],
  injuries:     ['inj','injuries','injuries_direct'],
  fatalities:   ['fat','fatalities','deaths_direct','fatalities_direct'],
  damage_millions:['loss','damage_millions','damage','property_damage','damage_property']
};

let allData=[],filteredData=[],mapLayers={},map,selectedRow=null,sortCol=null,sortAsc=true,efFilter='ALL',allDates=[],rawHeaders=[],rawRows=[],colMapping={};

function detectColumns(headers){
  const m={},hl=headers.map(h=>h.toLowerCase().trim());
  for(const [f,aliases] of Object.entries(COL_ALIASES)){
    for(const a of aliases){const i=hl.indexOf(a);if(i!==-1){m[f]=headers[i];break;}}
  }
  return m;
}

function handleDragOver(e){e.preventDefault();document.getElementById('dropZone').classList.add('drag-over');}
function handleDragLeave(){document.getElementById('dropZone').classList.remove('drag-over');}
function handleDrop(e){e.preventDefault();handleDragLeave();const f=e.dataTransfer.files[0];if(f)processFile(f);}
function handleFileSelect(e){const f=e.target.files[0];if(f)processFile(f);}

function processFile(file){
  document.getElementById('loadingOverlay').classList.add('show');
  setTimeout(()=>{
    Papa.parse(file,{
      header:true,skipEmptyLines:true,
      complete(results){
        rawHeaders=results.meta.fields||[];rawRows=results.data;
        colMapping=detectColumns(rawHeaders);
        document.getElementById('loadingOverlay').classList.remove('show');
        if(!colMapping.start_lat||!colMapping.start_lon) showMapper(rawHeaders);
        else loadData(rawRows,colMapping);
      },
      error(){document.getElementById('loadingOverlay').classList.remove('show');alert('Error parsing CSV.');}
    });
  },400);
}

function showMapper(headers){
  const fields=[
    {key:'start_lat',label:'Start Latitude',req:true},{key:'start_lon',label:'Start Longitude',req:true},
    {key:'id',label:'Tornado ID'},{key:'date',label:'Date'},{key:'state',label:'State'},
    {key:'ef_scale',label:'EF/F Scale'},{key:'end_lat',label:'End Latitude'},{key:'end_lon',label:'End Longitude'},
    {key:'length_miles',label:'Length (mi)'},{key:'width_yards',label:'Width (yd)'},
    {key:'injuries',label:'Injuries'},{key:'fatalities',label:'Fatalities'},{key:'damage_millions',label:'Damage ($M)'},
  ];
  document.getElementById('mapperFields').innerHTML=fields.map(f=>`
    <div class="mapper-row">
      <div class="mapper-label ${f.req?'':'mapper-opt'}">${f.req?'* ':''}${f.label}</div>
      <select class="mapper-select" id="map_${f.key}">
        <option value="">— skip —</option>
        ${headers.map(h=>`<option value="${h}"${h===colMapping[f.key]?' selected':''}>${h}</option>`).join('')}
      </select>
    </div>`).join('');
  document.getElementById('mapperOverlay').classList.add('show');
}

function applyMapping(){
  for(const k of Object.keys(COL_ALIASES)){const el=document.getElementById('map_'+k);if(el&&el.value)colMapping[k]=el.value;}
  document.getElementById('mapperOverlay').classList.remove('show');
  loadData(rawRows,colMapping);
}

function loadData(rows,m){
  const get=(row,f)=>m[f]?row[m[f]]:undefined;
  // Auto-detect if damage is in raw dollars or already in millions
  // Sample non-zero values: if typical value >= 1000, it's raw dollars
  const dmgSample=rows.slice(0,200).map(r=>parseFloat(String(get(r,'damage_millions')||'0').replace(/[$,]/g,''))).filter(v=>!isNaN(v)&&v>0);
  const dmgMedian=dmgSample.length?dmgSample.sort((a,b)=>a-b)[Math.floor(dmgSample.length/2)]:0;
  const dmgDivisor=dmgMedian>=1000?1e6:1;
  allData=rows.map((row,i)=>{
    const slat=parseFloat(get(row,'start_lat')),slon=parseFloat(get(row,'start_lon'));
    if(isNaN(slat)||isNaN(slon))return null;
    const efRaw=get(row,'ef_scale');
    const ef=(efRaw!==undefined&&efRaw!=='')?parseInt(efRaw):null;
    let dmg=parseFloat(String(get(row,'damage_millions')||'0').replace(/[$,]/g,''));
    if(isNaN(dmg))dmg=0;else dmg=dmg/dmgDivisor;
    const moRaw=get(row,'mo');
    const mo=moRaw?parseInt(moRaw):null;
    const elat=parseFloat(get(row,'end_lat'));
    const elon=parseFloat(get(row,'end_lon'));
    return{
      _idx:i,
      id:get(row,'id')||`T-${String(i+1).padStart(4,'0')}`,
      date:get(row,'date')||'',
      time:get(row,'time')||'',
      mo:mo,
      state:get(row,'state')||'',
      county:get(row,'county')||'',
      start_lat:slat,start_lon:slon,
      end_lat:!isNaN(elat)?elat:null,
      end_lon:!isNaN(elon)?elon:null,
      ef_scale:ef,
      length_miles:parseFloat(get(row,'length_miles'))||0,
      width_yards:parseFloat(get(row,'width_yards'))||0,
      injuries:parseInt(get(row,'injuries'))||0,
      fatalities:parseInt(get(row,'fatalities'))||0,
      damage_millions:dmg,
    };
  }).filter(Boolean);
  if(!allData.length){alert('No valid coordinate rows found. Please check your lat/lon columns.');return;}
  initDashboard();
}

function initDashboard(){
  document.getElementById('dropOverlay').classList.add('hidden');
  document.getElementById('map-panel').style.display='';
  document.getElementById('headerStats').style.display='flex';
  document.getElementById('exportBar').style.display='flex';
  const maxEF=Math.max(...allData.map(d=>d.ef_scale??-1));
  const totalFat=allData.reduce((s,d)=>s+d.fatalities,0);
  const totalInj=allData.reduce((s,d)=>s+d.injuries,0);
  const totalDmg=allData.reduce((s,d)=>s+d.damage_millions,0);
  document.getElementById('statTotal').textContent=allData.length.toLocaleString();
  document.getElementById('statMaxEF').textContent=maxEF>=0?`EF${maxEF}`:'—';
  document.getElementById('statFatalities').textContent=totalFat.toLocaleString();
  document.getElementById('statInjuries').textContent=totalInj.toLocaleString();
  document.getElementById('statDamage').textContent=totalDmg>1000?`$${(totalDmg/1000).toFixed(1)}B`:`$${totalDmg.toFixed(1)}M`;
  // State filter
  const states=[...new Set(allData.map(d=>d.state).filter(Boolean))].sort();
  const se=document.getElementById('stateFilter');
  se.innerHTML='<option value="">All States</option>';
  states.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;se.appendChild(o);});
  // Month filter
  const months=[...new Set(allData.map(d=>d.mo).filter(m=>m!==null))].sort((a,b)=>a-b);
  const me=document.getElementById('monthFilter');
  me.innerHTML='<option value="">All Months</option>';
  months.forEach(mo=>{const o=document.createElement('option');o.value=mo;o.textContent=MONTHS[mo-1]||mo;me.appendChild(o);});
  // Time slider
  allDates=[...new Set(allData.map(d=>d.date).filter(Boolean))].sort();
  if(allDates.length>1){
    const sl=document.getElementById('timeSlider');
    sl.max=allDates.length-1;sl.value=allDates.length-1;
    document.getElementById('timeSliderCard').style.display='block';
    sl.addEventListener('input',()=>{
      document.getElementById('sliderLabel').textContent=allDates[parseInt(sl.value)]||'All';
      applyFilters();
    });
  }
  filteredData=[...allData];
  renderTable();
  renderMap();
  document.getElementById('sysStatus').textContent='ACTIVE';
}

function setEfFilter(ef,btn){
  efFilter=ef;
  document.querySelectorAll('.ef-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');applyFilters();
}

function applyFilters(){
  const search=document.getElementById('searchInput').value.toLowerCase();
  const state=document.getElementById('stateFilter').value;
  const month=document.getElementById('monthFilter').value;
  const sl=document.getElementById('timeSlider');
  const maxDate=allDates.length?allDates[parseInt(sl.value)]:null;
  filteredData=allData.filter(d=>{
    if(efFilter!=='ALL'&&String(d.ef_scale)!==efFilter)return false;
    if(state&&d.state!==state)return false;
    if(month&&String(d.mo)!==month)return false;
    if(maxDate&&d.date>maxDate)return false;
    if(search&&!`${d.id} ${d.state} ${d.county} ${d.date}`.toLowerCase().includes(search))return false;
    return true;
  });
  renderTable();updateMapVisibility();
}

function sortTable(col){
  if(sortCol===col)sortAsc=!sortAsc;else{sortCol=col;sortAsc=true;}
  document.querySelectorAll('th').forEach(t=>{t.classList.remove('sorted','asc');});
  const th=document.getElementById('th-'+col);
  if(th){th.classList.add('sorted');if(sortAsc)th.classList.add('asc');}
  filteredData.sort((a,b)=>{
    let av=a[col]??'',bv=b[col]??'';
    if(typeof av==='string')av=av.toLowerCase();if(typeof bv==='string')bv=bv.toLowerCase();
    if(av<bv)return sortAsc?-1:1;if(av>bv)return sortAsc?1:-1;return 0;
  });
  renderTable();
}

function renderTable(){
  const noData=document.getElementById('noDataMsg'),table=document.getElementById('dataTable');
  document.getElementById('rowCount').textContent=`${filteredData.length} event${filteredData.length!==1?'s':''}`;
  if(!filteredData.length){noData.style.display='flex';table.style.display='none';return;}
  noData.style.display='none';table.style.display='table';
  document.getElementById('tableBody').innerHTML=filteredData.map(d=>{
    const ef=d.ef_scale,color=ef!==null?getEfColor(ef):'#7a9ab8';
    const textColor=(ef===1)?'#111':'#000';
    const dmgDisplay=d.damage_millions?'$'+d.damage_millions.toFixed(2)+'M':'—';
    return`<tr data-idx="${d._idx}" onclick="selectTornado(${d._idx})" class="${selectedRow===d._idx?'selected':''}">
      <td class="td-id">${String(d.id)}<br><span style="color:#3a5a78;font-size:9px">${d.date}</span></td>
      <td><span class="ef-badge" style="background:${color};color:${textColor}">${ef!==null?'EF'+ef:'?'}</span></td>
      <td>${d.state||'—'}</td>
      <td>${d.length_miles?d.length_miles.toFixed(1)+' mi':'—'}</td>
      <td style="color:${d.fatalities>0?'#f44336':'inherit'}">${d.fatalities||'—'}</td>
      <td>${dmgDisplay}</td>
    </tr>`;
  }).join('');
}

let tileLayer=null;
const TILES={
  dark:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};
function getTheme(){return document.body.classList.contains('light')?'light':'dark';}
function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  document.getElementById('themeToggle').textContent=isLight?'🌙':'☀️';
  if(tileLayer&&map){
    map.removeLayer(tileLayer);
    tileLayer=L.tileLayer(TILES[isLight?'light':'dark'],{maxZoom:19,minZoom:3}).addTo(map);
    tileLayer.bringToBack();
  }
}
function makeMarkerLayers(d,lonOffset){
  const ef=d.ef_scale??0,color=getEfColor(ef),weight=1.5+(ef*0.7);
  const layers=[];
  const slon=d.start_lon+lonOffset;
  const hasEnd=d.end_lat!==null&&d.end_lon!==null&&(Math.abs(d.end_lat)>0.001||Math.abs(d.end_lon)>0.001);
  if(hasEnd){
    const line=L.polyline([[d.start_lat,slon],[d.end_lat,d.end_lon+lonOffset]],{color,weight,opacity:0.8,interactive:lonOffset===0});
    if(lonOffset===0)line.on('click',()=>selectTornado(d._idx));
    layers.push(line);
  }
  const size=5+(ef*2);
  const icon=L.divIcon({
    html:`<div style="width:${size}px;height:${size}px;background:${color};border:1px solid rgba(0,0,0,0.4);border-radius:${ef<3?'50%':'0'};box-shadow:0 0 5px ${color}88;${ef===5?'transform:rotate(45deg);':''}"></div>`,
    className:'',iconSize:[size,size],iconAnchor:[size/2,size/2]
  });
  const marker=L.marker([d.start_lat,slon],{icon,interactive:lonOffset===0});
  if(lonOffset===0){marker.bindPopup(buildPopup(d),{maxWidth:280});marker.on('click',()=>selectTornado(d._idx));}
  layers.push(marker);
  return layers;
}
function renderMap(){
  if(!map){
    map=L.map('map',{zoomControl:true,attributionControl:false,preferCanvas:true,minZoom:3,maxBounds:L.latLngBounds(L.latLng(-85.05,-540),L.latLng(85.05,540)),maxBoundsViscosity:1.0}).setView([20,0],3);
    tileLayer=L.tileLayer(TILES[getTheme()],{maxZoom:19,minZoom:3}).addTo(map);
    map.on('mousemove',e=>{document.getElementById('coordDisplay').textContent=`LAT ${e.latlng.lat.toFixed(4)} LON ${e.latlng.lng.toFixed(4)}`;});
  }
  Object.values(mapLayers).forEach(lg=>{if(lg)map.removeLayer(lg);});
  mapLayers={};
  allData.forEach(d=>{
    const allLayers=[
      ...makeMarkerLayers(d,0),
      ...makeMarkerLayers(d,-360),
      ...makeMarkerLayers(d,360),
    ];
    mapLayers[d._idx]=L.layerGroup(allLayers).addTo(map);
  });
  fitMapToBounds();
}

function buildPopup(d){
  const ef=d.ef_scale,color=ef!==null?getEfColor(ef):'#7a9ab8';
  const monthName=d.mo?MONTHS[d.mo-1]:'—';
  return`<div style="min-width:220px">
    <div class="popup-title" style="color:${color}">EF${ef??'?'} — ${d.state||'Unknown'}</div>
    <div class="popup-grid">
      <div class="popup-item"><label>ID</label><span>${d.id}</span></div>
      <div class="popup-item"><label>Date</label><span>${d.date||'—'}</span></div>
      <div class="popup-item"><label>Time</label><span>${d.time||'—'}</span></div>
      <div class="popup-item"><label>Month</label><span>${monthName}</span></div>
      <div class="popup-item"><label>Length</label><span>${d.length_miles?d.length_miles.toFixed(2)+' mi':'—'}</span></div>
      <div class="popup-item"><label>Width</label><span>${d.width_yards?Math.round(d.width_yards)+' yd':'—'}</span></div>
      <div class="popup-item"><label>Injuries</label><span>${d.injuries||0}</span></div>
      <div class="popup-item"><label>Fatalities</label><span style="color:${d.fatalities>0?'#f44336':'inherit'}">${d.fatalities||0}</span></div>
      <div class="popup-item"><label>Start Coord</label><span>${d.start_lat.toFixed(4)}, ${d.start_lon.toFixed(4)}</span></div>
      <div class="popup-item"><label>Damage</label><span>$${d.damage_millions.toFixed(3)}M</span></div>
    </div>
  </div>`;
}

function updateMapVisibility(){
  const vis=new Set(filteredData.map(d=>d._idx));
  Object.entries(mapLayers).forEach(([idx,lg])=>{
    if(!lg)return;const i=parseInt(idx);
    if(vis.has(i)){if(!map.hasLayer(lg))lg.addTo(map);}
    else{if(map.hasLayer(lg))map.removeLayer(lg);}
  });
}

function fitMapToBounds(){
  const pts=filteredData.filter(d=>!isNaN(d.start_lat)&&!isNaN(d.start_lon));
  if(!pts.length)return;
  map.fitBounds(L.latLngBounds(pts.map(d=>[d.start_lat,d.start_lon])),{padding:[40,40]});
}

function selectTornado(idx){
  selectedRow=idx;const d=allData[idx];if(!d)return;
  document.querySelectorAll('#tableBody tr').forEach(tr=>tr.classList.remove('selected'));
  const tr=document.querySelector(`#tableBody tr[data-idx="${idx}"]`);
  if(tr){tr.classList.add('selected');tr.scrollIntoView({behavior:'smooth',block:'nearest'});}
  if(map&&!isNaN(d.start_lat)){
    map.setView([d.start_lat,d.start_lon],10,{animate:true});
    const lg=mapLayers[idx];
    if(lg)lg.eachLayer(l=>{if(l.openPopup)l.openPopup();});
  }
}

function exportCSV(){
  if(!filteredData.length)return;
  const keys=Object.keys(filteredData[0]).filter(k=>!k.startsWith('_'));
  const csv=[keys.join(','),...filteredData.map(d=>keys.map(k=>JSON.stringify(d[k]??'')).join(','))].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='tornado_export.csv';a.click();
}

function resetApp(){
  allData=[];filteredData=[];selectedRow=null;sortCol=null;sortAsc=true;efFilter='ALL';allDates=[];
  Object.values(mapLayers).forEach(l=>{if(l&&map)map.removeLayer(l);});mapLayers={};
  document.getElementById('dropOverlay').classList.remove('hidden');
  document.getElementById('map-panel').style.display='none';
  document.getElementById('headerStats').style.display='none';
  document.getElementById('exportBar').style.display='none';
  document.getElementById('stateFilter').innerHTML='<option value="">All States</option>';
  document.getElementById('monthFilter').innerHTML='<option value="">All Months</option>';
  document.getElementById('tableBody').innerHTML='';
  document.getElementById('dataTable').style.display='none';
  document.getElementById('noDataMsg').style.display='flex';
  document.getElementById('fileInput').value='';
  document.getElementById('sysStatus').textContent='READY';
  document.getElementById('timeSliderCard').style.display='none';
  document.getElementById('rowCount').textContent='0 events';
  document.querySelectorAll('.ef-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.ef-btn[data-ef="ALL"]').classList.add('active');
  map.setView([37,-92],4);
  document.getElementById('searchInput').value='';
  document.getElementById('statTotal').textContent='—';
  document.getElementById('statMaxEF').textContent='—';
  document.getElementById('statFatalities').textContent='—';
  document.getElementById('statInjuries').textContent='—';
  document.getElementById('statDamage').textContent='—';
}