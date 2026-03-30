// ─── Constants ───────────────────────────────────────────────────────────────
const EF_COLORS={0:'#4caf50',1:'#80ecf1',2:'#eeff00',3:'#f4a836',4:'#b02727',5:'#fa01d0'};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function getEfColor(ef){return EF_COLORS[ef]??'#7a9ab8';}

// Column aliases — supports NOAA SPC format AND generic formats
const COL_ALIASES={
  id:           ['om','tornado_id','id','event_id','stormid'],
  date:         ['date','event_date','begin_date','datetime'],
  time:         ['time','begin_time','event_time'],
  mo:           ['mo','month'],
  yr:           ['yr','year'],
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

// ─── State ────────────────────────────────────────────────────────────────────
let allData=[],filteredData=[],map,tileLayer,
    clusterGroup=null,rawMarkerGroup=null,useClustering=true,
    selectedRow=null,sortCol=null,sortAsc=true,efFilter='ALL',
    allDates=[],rawHeaders=[],rawRows=[],colMapping={};

// Pagination
const PAGE_SIZE=200;
let currentPage=0,totalPages=0;

// ─── Column detection ─────────────────────────────────────────────────────────
function detectColumns(headers){
  const m={},hl=headers.map(h=>h.toLowerCase().trim());
  for(const [f,aliases] of Object.entries(COL_ALIASES)){
    for(const a of aliases){const i=hl.indexOf(a);if(i!==-1){m[f]=headers[i];break;}}
  }
  return m;
}

// ─── File handling ────────────────────────────────────────────────────────────
function handleDragOver(e){e.preventDefault();document.getElementById('dropZone').classList.add('drag-over');}
function handleDragLeave(){document.getElementById('dropZone').classList.remove('drag-over');}
function handleDrop(e){
  e.preventDefault();handleDragLeave();
  const files=[...e.dataTransfer.files].filter(f=>f.name.endsWith('.csv'));
  if(files.length)processFiles(files);
}
function handleFileSelect(e){
  const files=[...e.target.files].filter(f=>f.name.endsWith('.csv'));
  if(files.length)processFiles(files);
}

// ─── Multi-file processing ────────────────────────────────────────────────────
function processFiles(files){
  document.getElementById('loadingOverlay').classList.add('show');
  setLoadingText(`Loading ${files.length} file${files.length>1?'s':''}…`);
  const allRows=[];let headers=null;let pending=files.length;
  files.forEach(file=>{
    Papa.parse(file,{
      header:true,skipEmptyLines:true,
      complete(results){
        if(!headers){
          headers=results.meta.fields||[];
          rawHeaders=headers;
          colMapping=detectColumns(headers);
        }
        allRows.push(...results.data);
        pending--;
        if(pending===0){
          document.getElementById('loadingOverlay').classList.remove('show');
          rawRows=allRows;
          if(!colMapping.start_lat||!colMapping.start_lon) showMapper(headers);
          else loadData(rawRows,colMapping);
        }
      },
      error(){
        pending--;
        if(pending===0){document.getElementById('loadingOverlay').classList.remove('show');alert('Error parsing one or more CSV files.');}
      }
    });
  });
}

function setLoadingText(txt){
  const el=document.getElementById('loadingOverlay').querySelector('.loading-text');
  if(el)el.textContent=txt;
}

// ─── Column mapper ────────────────────────────────────────────────────────────
function showMapper(headers){
  const fields=[
    {key:'start_lat',label:'Start Latitude',req:true},{key:'start_lon',label:'Start Longitude',req:true},
    {key:'id',label:'Tornado ID'},{key:'date',label:'Date'},{key:'state',label:'State'},
    {key:'county',label:'County'},{key:'yr',label:'Year'},{key:'mo',label:'Month'},
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

// ─── Data loading ─────────────────────────────────────────────────────────────
function loadData(rows,m){
  const get=(row,f)=>m[f]?row[m[f]]:undefined;

  allData=rows.map((row,i)=>{
    const slat=parseFloat(get(row,'start_lat')),slon=parseFloat(get(row,'start_lon'));
    if(isNaN(slat)||isNaN(slon))return null;

    const yrRaw=get(row,'yr')||get(row,'year');
    let yr=yrRaw?parseInt(yrRaw):null;
    if(!yr){
      const dateStr=get(row,'date')||'';
      const m4=dateStr.match(/\b(\d{4})\b/);
      if(m4)yr=parseInt(m4[1]);
    }

    const currentDivisor=(yr&&yr>=2016)?1e6:1;

    let dmg=parseFloat(String(get(row,'damage_millions')||'0').replace(/[$,]/g,''));
    if(isNaN(dmg))dmg=0;else dmg=dmg/currentDivisor;

    const efRaw=get(row,'ef_scale');
    const ef=(efRaw!==undefined&&efRaw!=='')?parseInt(efRaw):null;
    const moRaw=get(row,'mo');
    const mo=moRaw?parseInt(moRaw):null;
    const elat=parseFloat(get(row,'end_lat'));
    const elon=parseFloat(get(row,'end_lon'));

    return{
      _idx:i,
      id:get(row,'id')||`T-${String(i+1).padStart(4,'0')}`,
      date:get(row,'date')||'',
      time:get(row,'time')||'',
      mo,yr,
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


// ─── Dashboard init ───────────────────────────────────────────────────────────
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

  // County filter (all counties; narrows when state chosen)
  rebuildCountyFilter('');

  // Month filter
  const months=[...new Set(allData.map(d=>d.mo).filter(m=>m!==null))].sort((a,b)=>a-b);
  const me=document.getElementById('monthFilter');
  me.innerHTML='<option value="">All Months</option>';
  months.forEach(mo=>{const o=document.createElement('option');o.value=mo;o.textContent=MONTHS[mo-1]||mo;me.appendChild(o);});

  // Year filter
  const years=[...new Set(allData.map(d=>d.yr).filter(Boolean))].sort((a,b)=>a-b);
  const ye=document.getElementById('yearFilter');
  ye.innerHTML='<option value="">All Years</option>';
  years.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;ye.appendChild(o);});

  // Date range: set min/max from data
  allDates=[...new Set(allData.map(d=>d.date).filter(Boolean))].sort();
  if(allDates.length){
    document.getElementById('dateFrom').min=allDates[0];
    document.getElementById('dateFrom').max=allDates[allDates.length-1];
    document.getElementById('dateTo').min=allDates[0];
    document.getElementById('dateTo').max=allDates[allDates.length-1];
  }

  // Hide legacy time slider card
  document.getElementById('timeSliderCard').style.display='none';

  // State filter changes → narrow county list
  document.getElementById('stateFilter').addEventListener('change',()=>{
    rebuildCountyFilter(document.getElementById('stateFilter').value);
    applyFilters();
  });

  filteredData=[...allData];
  currentPage=0;
  renderTable();
  renderMap();
  document.getElementById('sysStatus').textContent='ACTIVE';
}

function rebuildCountyFilter(state){
  const source=state?allData.filter(d=>d.state===state):allData;
  const counties=[...new Set(source.map(d=>d.county).filter(Boolean))].sort();
  const ce=document.getElementById('countyFilter');
  ce.innerHTML='<option value="">All Counties</option>';
  counties.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;ce.appendChild(o);});
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function setEfFilter(ef,btn){
  efFilter=ef;
  document.querySelectorAll('.ef-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function clearDateRange(){
  document.getElementById('dateFrom').value='';
  document.getElementById('dateTo').value='';
  applyFilters();
}

function applyFilters(){
  const search=document.getElementById('searchInput').value.toLowerCase();
  const state=document.getElementById('stateFilter').value;
  const county=document.getElementById('countyFilter').value;
  const month=document.getElementById('monthFilter').value;
  const year=document.getElementById('yearFilter').value;
  const dateFrom=document.getElementById('dateFrom').value; // yyyy-mm-dd
  const dateTo=document.getElementById('dateTo').value;

  filteredData=allData.filter(d=>{
    if(efFilter!=='ALL'&&String(d.ef_scale)!==efFilter)return false;
    if(state&&d.state!==state)return false;
    if(county&&d.county!==county)return false;
    if(month&&String(d.mo)!==month)return false;
    if(year&&String(d.yr)!==year)return false;
    if(dateFrom&&d.date&&d.date<dateFrom)return false;
    if(dateTo&&d.date&&d.date>dateTo)return false;
    if(search&&!`${d.id} ${d.state} ${d.county} ${d.date}`.toLowerCase().includes(search))return false;
    return true;
  });

  currentPage=0;
  renderTable();
  updateMapVisibility();
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function sortTable(col){
  if(sortCol===col)sortAsc=!sortAsc;else{sortCol=col;sortAsc=true;}
  document.querySelectorAll('th').forEach(t=>{t.classList.remove('sorted','asc','desc');});
  const th=document.getElementById('th-'+col);
  if(th){th.classList.add('sorted');th.classList.add(sortAsc?'asc':'desc');}
  filteredData.sort((a,b)=>{
    let av=a[col]??'',bv=b[col]??'';
    if(typeof av==='string')av=av.toLowerCase();if(typeof bv==='string')bv=bv.toLowerCase();
    if(av<bv)return sortAsc?-1:1;if(av>bv)return sortAsc?1:-1;return 0;
  });
  currentPage=0;
  renderTable();
}

// ─── Table rendering (paginated) ──────────────────────────────────────────────
function renderTable(){
  const noData=document.getElementById('noDataMsg'),table=document.getElementById('dataTable');
  document.getElementById('rowCount').textContent=`${filteredData.length} event${filteredData.length!==1?'s':''}`;
  if(!filteredData.length){noData.style.display='flex';table.style.display='none';removePaginationBar();return;}

  totalPages=Math.ceil(filteredData.length/PAGE_SIZE);
  if(currentPage>=totalPages)currentPage=totalPages-1;
  const slice=filteredData.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);

  noData.style.display='none';table.style.display='table';
  document.getElementById('tableBody').innerHTML=slice.map(d=>{
    const ef=d.ef_scale,color=ef!==null?getEfColor(ef):'#7a9ab8';
    const textColor=(ef===1)?'#111':'#000';
    const dmgDisplay=d.damage_millions?'$'+d.damage_millions.toFixed(2)+'M':'—';
    return`<tr data-idx="${d._idx}" onclick="selectTornado(${d._idx})" class="${selectedRow===d._idx?'selected':''}">
      <td class="td-id">${String(d.id)}<br><span style="color:var(--text-muted);font-size:9px">${d.date}</span></td>
      <td><span class="ef-badge" style="background:${color};color:${textColor}">${ef!==null?'EF'+ef:'?'}</span></td>
      <td>${d.state||'—'}</td>
      <td style="max-width:80px;overflow:hidden;text-overflow:ellipsis" title="${d.county||''}">${d.county||'—'}</td>
      <td>${d.length_miles?d.length_miles.toFixed(1)+' mi':'—'}</td>
      <td style="color:${d.fatalities>0?'#f44336':'inherit'}">${d.fatalities||'—'}</td>
      <td>${dmgDisplay}</td>
    </tr>`;
  }).join('');

  renderPaginationBar();
}

function renderPaginationBar(){
  let bar=document.getElementById('paginationBar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='paginationBar';
    bar.className='pagination-bar';
    const tableWrap=document.querySelector('.table-wrap');
    tableWrap.parentNode.insertBefore(bar,tableWrap.nextSibling);
  }
  if(totalPages<=1){bar.style.display='none';return;}
  bar.style.display='flex';
  const start=currentPage*PAGE_SIZE+1;
  const end=Math.min((currentPage+1)*PAGE_SIZE,filteredData.length);
  bar.innerHTML=`
    <button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===0?'disabled':''}>&#8249;</button>
    <span class="page-info">${start}–${end} of ${filteredData.length}</span>
    <button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage>=totalPages-1?'disabled':''}>&#8250;</button>`;
}

function removePaginationBar(){
  const bar=document.getElementById('paginationBar');
  if(bar)bar.style.display='none';
}

function goPage(p){
  if(p<0||p>=totalPages)return;
  currentPage=p;
  renderTable();
  document.querySelector('.table-wrap').scrollTop=0;
}

// ─── Map rendering ────────────────────────────────────────────────────────────
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

// Marker layer store for non-clustered mode
const markerLayerMap={};

function buildMarker(d,lonOffset){
  const ef=d.ef_scale??0,color=getEfColor(ef);
  const weight=1.5+(ef*0.7);
  const slon=d.start_lon+lonOffset;
  const hasEnd=d.end_lat!==null&&d.end_lon!==null&&(Math.abs(d.end_lat)>0.001||Math.abs(d.end_lon)>0.001);

  // Path width encoding: scale line width by tornado width (yards), capped at 8px
  const widthW=d.width_yards?Math.min(1+d.width_yards/200,8):weight;

  const layers=[];
  if(hasEnd&&lonOffset===0){
    const line=L.polyline([[d.start_lat,slon],[d.end_lat,d.end_lon+lonOffset]],{color,weight:widthW,opacity:0.75,interactive:true});
    line.on('click',()=>selectTornado(d._idx));
    layers.push(line);
  }
  const size=5+(ef*2);
  const icon=L.divIcon({
    html:`<div style="width:${size}px;height:${size}px;background:${color};border:1px solid rgba(0,0,0,0.4);border-radius:${ef<3?'50%':'0'};box-shadow:0 0 5px ${color}88;${ef===5?'transform:rotate(45deg);':''}"></div>`,
    className:'',iconSize:[size,size],iconAnchor:[size/2,size/2]
  });
  const marker=L.marker([d.start_lat,slon],{icon,interactive:true});
  marker.bindPopup(buildPopup(d),{maxWidth:280});
  marker.on('click',()=>selectTornado(d._idx));
  layers.push(marker);
  return layers;
}

function renderMap(){
  if(!map){
    map=L.map('map',{zoomControl:true,attributionControl:false,preferCanvas:true,minZoom:3,
      maxBounds:L.latLngBounds(L.latLng(-85.05,-540),L.latLng(85.05,540)),maxBoundsViscosity:1.0}).setView([38,-92],4);
    tileLayer=L.tileLayer(TILES[getTheme()],{maxZoom:19,minZoom:3}).addTo(map);
    map.on('mousemove',e=>{document.getElementById('coordDisplay').textContent=`LAT ${e.latlng.lat.toFixed(4)} LON ${e.latlng.lng.toFixed(4)}`;});
  }

  // Clear existing layers
  clearMapLayers();

  // Build all markers
  if(useClustering){
    clusterGroup=L.markerClusterGroup({
      maxClusterRadius:40,
      minimumClusterSize:6,
      iconCreateFunction(cluster){
        const c=cluster.getChildCount();
        const sz=c<10?32:c<100?38:44;
        return L.divIcon({html:`<div class="cluster-icon" style="width:${sz}px;height:${sz}px;line-height:${sz}px">${c}</div>`,className:'',iconSize:[sz,sz]});
      }
    });
    allData.forEach(d=>{
      const layers=buildMarker(d,0);
      layers.forEach(l=>clusterGroup.addLayer(l));
      // Wrapping copies (non-clustered, no popup)
      buildMarker(d,-360).forEach(l=>{if(l instanceof L.Polyline)map.addLayer(l);});
      buildMarker(d,360).forEach(l=>{if(l instanceof L.Polyline)map.addLayer(l);});
    });
    map.addLayer(clusterGroup);
  } else {
    rawMarkerGroup=L.layerGroup();
    allData.forEach(d=>{
      const layers=[...buildMarker(d,0),...buildMarker(d,-360),...buildMarker(d,360)];
      const lg=L.layerGroup(layers);
      rawMarkerGroup.addLayer(lg);
      markerLayerMap[d._idx]=lg;
    });
    rawMarkerGroup.addTo(map);
  }

  updateMapVisibility();
  fitMapToBounds();
  updateClusterBtn();
}

function clearMapLayers(){
  if(clusterGroup){map.removeLayer(clusterGroup);clusterGroup=null;}
  if(rawMarkerGroup){map.removeLayer(rawMarkerGroup);rawMarkerGroup=null;}
  // Remove any orphan polylines (wrapping copies)
  map.eachLayer(l=>{if(l instanceof L.Polyline&&!(l instanceof L.Polygon))map.removeLayer(l);});
  for(const k in markerLayerMap)delete markerLayerMap[k];
}

function toggleClustering(){
  useClustering=!useClustering;
  clearMapLayers();
  // Re-render map layers only (no full re-init)
  if(useClustering){
    clusterGroup=L.markerClusterGroup({
      maxClusterRadius:40,
      minimumClusterSize:6,
      iconCreateFunction(cluster){
        const c=cluster.getChildCount();
        const sz=c<10?32:c<100?38:44;
        return L.divIcon({html:`<div class="cluster-icon" style="width:${sz}px;height:${sz}px;line-height:${sz}px">${c}</div>`,className:'',iconSize:[sz,sz]});
      }
    });
    allData.forEach(d=>{
      const layers=buildMarker(d,0);
      layers.forEach(l=>clusterGroup.addLayer(l));
    });
    map.addLayer(clusterGroup);
  } else {
    rawMarkerGroup=L.layerGroup();
    allData.forEach(d=>{
      const layers=[...buildMarker(d,0),...buildMarker(d,-360),...buildMarker(d,360)];
      const lg=L.layerGroup(layers);
      rawMarkerGroup.addLayer(lg);
      markerLayerMap[d._idx]=lg;
    });
    rawMarkerGroup.addTo(map);
  }
  updateMapVisibility();
  updateClusterBtn();
}

function updateClusterBtn(){
  const btn=document.getElementById('clusterToggleBtn');
  if(btn)btn.textContent=useClustering?'⬛ Cluster ON':'⬜ Cluster OFF';
}

function updateMapVisibility(){
  const vis=new Set(filteredData.map(d=>d._idx));
  if(useClustering){
    // With clustering: remove/add individual layers from the cluster group
    if(!clusterGroup)return;
    clusterGroup.eachLayer(l=>{
      const idx=l._tornadoIdx;
      if(idx!==undefined){
        if(vis.has(idx)){clusterGroup.addLayer(l);}
        else{clusterGroup.removeLayer(l);}
      }
    });
    // Simpler approach: refresh entire cluster visibility
    clusterGroup.clearLayers();
    filteredData.forEach(d=>{
      buildMarker(d,0).forEach(l=>clusterGroup.addLayer(l));
    });
  } else {
    Object.entries(markerLayerMap).forEach(([idx,lg])=>{
      const i=parseInt(idx);
      if(vis.has(i)){if(!map.hasLayer(lg))lg.addTo(map);}
      else{if(map.hasLayer(lg))map.removeLayer(lg);}
    });
  }
}

function fitMapToBounds(){
  const pts=filteredData.filter(d=>!isNaN(d.start_lat)&&!isNaN(d.start_lon));
  if(!pts.length)return;
  map.fitBounds(L.latLngBounds(pts.map(d=>[d.start_lat,d.start_lon])),{padding:[40,40]});
}

// ─── Popup ────────────────────────────────────────────────────────────────────
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
      <div class="popup-item"><label>County</label><span>${d.county||'—'}</span></div>
      <div class="popup-item"><label>Year</label><span>${d.yr||'—'}</span></div>
      <div class="popup-item"><label>Length</label><span>${d.length_miles?d.length_miles.toFixed(2)+' mi':'—'}</span></div>
      <div class="popup-item"><label>Width</label><span>${d.width_yards?Math.round(d.width_yards)+' yd':'—'}</span></div>
      <div class="popup-item"><label>Injuries</label><span>${d.injuries||0}</span></div>
      <div class="popup-item"><label>Fatalities</label><span style="color:${d.fatalities>0?'#f44336':'inherit'}">${d.fatalities||0}</span></div>
      <div class="popup-item"><label>Start Coord</label><span>${d.start_lat.toFixed(4)}, ${d.start_lon.toFixed(4)}</span></div>
      <div class="popup-item"><label>Damage</label><span>$${d.damage_millions.toFixed(3)}M</span></div>
    </div>
  </div>`;
}

// ─── Export ────────────────────────────────────────────────────────────
async function exportCSV() {
  if (!filteredData.length) return;

  let fileName = prompt("Enter file name:", "tornado_export");
  if (fileName === null) return;
  if (!fileName.endsWith('.csv')) fileName += '.csv';

  const keys = Object.keys(filteredData[0]).filter(k => !k.startsWith('_'));
  const csv = [
    keys.join(','), 
    ...filteredData.map(d => keys.map(k => JSON.stringify(d[k] ?? '')).join(','))
  ].join('\n');

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'CSV File',
          accept: { 'text/csv': ['.csv'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(csv);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
    }
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// ─── Reset ────────────────────────────────────────────────────────────────────
function resetApp(){
  allData=[];filteredData=[];selectedRow=null;sortCol=null;sortAsc=true;efFilter='ALL';allDates=[];currentPage=0;
  clearMapLayers();
  if(map)map.setView([38,-92],4);
  document.getElementById('dropOverlay').classList.remove('hidden');
  document.getElementById('map-panel').style.display='none';
  document.getElementById('headerStats').style.display='none';
  document.getElementById('exportBar').style.display='none';
  document.getElementById('stateFilter').innerHTML='<option value="">All States</option>';
  document.getElementById('countyFilter').innerHTML='<option value="">All Counties</option>';
  document.getElementById('monthFilter').innerHTML='<option value="">All Months</option>';
  document.getElementById('yearFilter').innerHTML='<option value="">All Years</option>';
  document.getElementById('dateFrom').value='';
  document.getElementById('dateTo').value='';
  document.getElementById('tableBody').innerHTML='';
  document.getElementById('dataTable').style.display='none';
  document.getElementById('noDataMsg').style.display='flex';
  document.getElementById('fileInput').value='';
  document.getElementById('sysStatus').textContent='READY';
  document.getElementById('timeSliderCard').style.display='none';
  document.getElementById('rowCount').textContent='0 events';
  document.querySelectorAll('.ef-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.ef-btn[data-ef="ALL"]').classList.add('active');
  document.getElementById('searchInput').value='';
  document.getElementById('statTotal').textContent='—';
  document.getElementById('statMaxEF').textContent='—';
  document.getElementById('statFatalities').textContent='—';
  document.getElementById('statInjuries').textContent='—';
  document.getElementById('statDamage').textContent='—';
  removePaginationBar();
}
