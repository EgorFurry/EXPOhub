import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import WebView from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

type Booth = {
  id: string;
  company_name: string;
  booth_number: string;
  hall: string;
  pavilion: string;
  tags: string[];
  map_center_x: number | null;
  map_center_y: number | null;
  map_polygon: { x: number; y: number }[] | null;
};

type Exhibition = {
  id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
};

// ─── ресурсы планов ───────────────────────────────────────────
const PAVILION_ASSETS: Record<string, any> = {
  '9':  require('../../assets/maps/pavilion_9.png'),
  '10': require('../../assets/maps/pavilion_10.png'),
  '11': require('../../assets/maps/pavilion_11.png'),
  '78': require('../../assets/maps/pavilion_78.png'),
};

// ─── загрузка PNG как base64 через expo-asset ─────────────────
async function loadPlanBase64(pavilion: string): Promise<string> {
  try {
    const asset = PAVILION_ASSETS[pavilion] ?? PAVILION_ASSETS['11'];
    const [loaded] = await Asset.loadAsync(asset);
    if (!loaded.localUri) return '';
    const base64 = await FileSystem.readAsStringAsync(loaded.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch {
    return '';
  }
}

function IconSearch() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={Colors.textMuted} strokeWidth={2} />
      <Line x1="16.5" y1="16.5" x2="22" y2="22" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconFilter({ active }: { active: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M7 12h10M11 18h2" stroke={active ? Colors.primary : Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function buildLeafletHTML(booths: Booth[], planBase64: string, accentColor: string): string {
  const planUri = planBase64
    ? `data:image/png;base64,${planBase64}`
    : '';

  const boothsJson = JSON.stringify(
    booths.map(b => ({
      id: b.id, name: b.company_name, number: b.booth_number,
      hall: b.hall, tags: b.tags ?? [],
      cx: b.map_center_x ?? null, cy: b.map_center_y ?? null,
      polygon: b.map_polygon ?? null,
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; background:#0B0B12; }
  .leaflet-popup-content-wrapper { background:#13131f; border:1px solid rgba(255,255,255,0.1); border-radius:14px; color:#fff; box-shadow:0 8px 32px rgba(0,0,0,0.6); }
  .leaflet-popup-tip { background:#13131f; }
  .leaflet-popup-content { margin:14px 16px; min-width:200px; }
  .popup-name { font-size:14px; font-weight:700; color:#fff; margin-bottom:3px; }
  .popup-meta { font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:10px; }
  .popup-tags { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px; }
  .popup-tag { font-size:10px; font-weight:600; background:rgba(196,18,48,0.2); border:1px solid rgba(196,18,48,0.4); border-radius:20px; padding:2px 8px; color:${accentColor}; }
  .popup-btns { display:flex; gap:8px; }
  .popup-btn { flex:1; padding:9px 6px; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; text-align:center; }
  .popup-btn-primary { background:${accentColor}; color:#fff; }
  .popup-btn-secondary { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.12); }
  .leaflet-control-zoom { border:none !important; }
  .leaflet-control-zoom a { background:#13131f !important; color:#fff !important; border:1px solid rgba(255,255,255,0.1) !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>
const BOOTHS = ${boothsJson};
const ACCENT = '${accentColor}';
const PLAN_URI = '${planUri}';
let markers = [];
let routeLine = null;
let activeTags = [];

const map = L.map('map', {
  crs: L.CRS.Simple, minZoom:-2, maxZoom:4,
  zoomControl:true, attributionControl:false,
});

const MAP_W = 1000;
const MAP_H = 750;
const bounds = [[0,0],[MAP_H,MAP_W]];

if (PLAN_URI) {
  L.imageOverlay(PLAN_URI, bounds, { opacity:1 }).addTo(map);
} else {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750"><rect width="1000" height="750" fill="#0d0d18"/><text x="500" y="375" fill="rgba(255,255,255,0.2)" font-size="18" text-anchor="middle" font-family="sans-serif">Загрузка плана...</text></svg>';
  L.imageOverlay('data:image/svg+xml;base64,'+btoa(svg), bounds).addTo(map);
}
map.fitBounds(bounds);

function renderBooths(booths) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

  booths.forEach(booth => {
    const dimmed = activeTags.length > 0 && !activeTags.some(t => booth.tags.includes(t));
    const color = dimmed ? '#444' : ACCENT;

    if (booth.polygon && booth.polygon.length >= 4) {
      const latlngs = booth.polygon.map(p => [MAP_H - p.y * MAP_H, p.x * MAP_W]);
      const poly = L.polygon(latlngs, {
        color, fillColor: color,
        fillOpacity: dimmed ? 0.05 : 0.28,
        weight: dimmed ? 0.5 : 1.5,
      }).addTo(map);

      if (!dimmed) {
        const cx = booth.cx ? booth.cx * MAP_W : latlngs.reduce((s,p)=>s+p[1],0)/latlngs.length;
        const cy = booth.cy ? MAP_H - booth.cy * MAP_H : latlngs.reduce((s,p)=>s+p[0],0)/latlngs.length;
        const label = L.divIcon({
          html: '<div style="font-size:9px;font-weight:700;color:#fff;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;text-align:center;">'+(booth.number||'')+'</div>',
          className:'', iconAnchor:[20,8], iconSize:[40,16],
        });
        markers.push(L.marker([cy, cx], { icon: label, interactive: false }).addTo(map));
        poly.bindPopup(buildPopup(booth));
        poly.on('click', () => { poly.openPopup(); notifySelected(booth.id); });
      }
      markers.push(poly);

    } else if (booth.cx !== null && booth.cy !== null) {
      const px = booth.cx * MAP_W;
      const py = MAP_H - booth.cy * MAP_H;
      const icon = L.divIcon({
        html: '<div style="background:'+color+';border:1.5px solid rgba(255,255,255,0.6);border-radius:5px;padding:2px 5px;font-size:9px;font-weight:700;color:#fff;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.5);">'+(booth.number||booth.name.slice(0,8))+'</div>',
        className:'', iconAnchor:[0,0],
      });
      const marker = L.marker([py, px], { icon }).addTo(map);
      if (!dimmed) {
        marker.bindPopup(buildPopup(booth));
        marker.on('click', () => { marker.openPopup(); notifySelected(booth.id); });
      }
      markers.push(marker);
    }
  });
}

function buildPopup(booth) {
  const tagsHtml = (booth.tags||[]).slice(0,3).map(t=>'<span class="popup-tag">'+t+'</span>').join('');
  return '<div class="popup-name">'+booth.name+'</div>'
    +'<div class="popup-meta">Стенд '+booth.number+' · '+booth.hall+'</div>'
    +(tagsHtml?'<div class="popup-tags">'+tagsHtml+'</div>':'')
    +'<div class="popup-btns">'
    +'<button class="popup-btn popup-btn-secondary" onclick="showRoute(\''+booth.id+'\')">🧭 Путь</button>'
    +'<button class="popup-btn popup-btn-primary" onclick="openBooth(\''+booth.id+'\')">Открыть →</button>'
    +'</div>';
}

function showRoute(boothId) {
  const booth = BOOTHS.find(b=>b.id===boothId);
  if (!booth) return;
  if (routeLine) { map.removeLayer(routeLine); routeLine=null; }
  const center = map.getCenter();
  const tx = booth.cx ? booth.cx*MAP_W : MAP_W/2;
  const ty = booth.cy ? MAP_H-booth.cy*MAP_H : MAP_H/2;
  routeLine = L.polyline([[center.lat,center.lng],[ty,tx]], {
    color:ACCENT, weight:3, dashArray:'8,6', opacity:0.9
  }).addTo(map);
  map.flyTo([ty,tx], 1, {duration:0.7});
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'ROUTE_TO',boothId}));
}

function searchBooth(query) {
  if (!query) { renderBooths(BOOTHS); return; }
  const q = query.toLowerCase();
  const found = BOOTHS.find(b=>b.name.toLowerCase().includes(q)||b.number.toLowerCase().includes(q));
  if (found) {
    const x = found.cx ? found.cx*MAP_W : MAP_W/2;
    const y = found.cy ? MAP_H-found.cy*MAP_H : MAP_H/2;
    map.flyTo([y,x], 2, {duration:0.7});
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'SEARCH_FOUND',boothId:found.id}));
  } else {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'SEARCH_NOT_FOUND'}));
  }
}

function notifySelected(id) { window.ReactNativeWebView.postMessage(JSON.stringify({type:'BOOTH_SELECTED',boothId:id})); }
function openBooth(id) { window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_BOOTH',boothId:id})); }

window.addEventListener('message', e => {
  try {
    const msg = JSON.parse(e.data);
    if (msg.type==='SET_BOOTHS') renderBooths(msg.booths);
    if (msg.type==='SEARCH') searchBooth(msg.query);
    if (msg.type==='SET_TAGS') { activeTags=msg.tags; renderBooths(BOOTHS); }
    if (msg.type==='CLEAR_ROUTE') { if(routeLine){map.removeLayer(routeLine);routeLine=null;} }
  } catch(_){}
});

if (BOOTHS.length>0) renderBooths(BOOTHS);
<\/script>
</body>
</html>`;
}

function getExhibitionDay(exhibition: Exhibition): string {
  const now = new Date(); const start = new Date(exhibition.start_date); const end = new Date(exhibition.end_date);
  now.setHours(0,0,0,0); start.setHours(0,0,0,0); end.setHours(0,0,0,0);
  if (now < start || now > end) return '';
  return `— День ${Math.floor((now.getTime()-start.getTime())/86400000)+1}`;
}

export default function MapScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [activePavilion, setActivePavilion] = useState('11');
  const [planBase64, setPlanBase64] = useState('');
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [searchNotFound, setSearchNotFound] = useState(false);

  useFocusEffect(useCallback(() => { loadMap(); }, []));

  async function loadMap() {
    setLoading(true); setSelectedBooth(null);
    const activeId = await AsyncStorage.getItem('active_exhibition_id');
    if (!activeId) { setActivated(false); setLoading(false); return; }
    setActivated(true);

    const { data: exData } = await supabase.from('exhibitions').select('*').eq('id', activeId).single();
    if (exData) setExhibition(exData);

    if (exData) {
      const { data: boothData } = await supabase.from('booths')
        .select('id,company_name,booth_number,hall,pavilion,tags,map_center_x,map_center_y,map_polygon')
        .eq('exhibition_id', exData.id).order('booth_number');
      if (boothData) setBooths(boothData);
    }

    // загружаем план павильона 11 по умолчанию
    const b64 = await loadPlanBase64('11');
    setPlanBase64(b64);

    setLoading(false);
  }

  async function switchPavilion(pav: string) {
    setActivePavilion(pav); setSelectedBooth(null); setSearch(''); setSearchNotFound(false);
    // загружаем план нового павильона
    const b64 = await loadPlanBase64(pav);
    setPlanBase64(b64);
    const filtered = booths.filter(b => b.pavilion === pav || !b.pavilion);
    webViewRef.current?.postMessage(JSON.stringify({ type:'SET_BOOTHS', booths:filtered }));
  }

  const allTags = [...new Set(booths.flatMap(b => b.tags ?? []))].sort();
  const visibleBooths = booths.filter(b => !activePavilion || b.pavilion === activePavilion || !b.pavilion);
  const pavilions = [...new Set(booths.map(b => b.pavilion).filter(Boolean))].sort();

  function handleSearch(text: string) {
    setSearch(text); setSearchNotFound(false);
    webViewRef.current?.postMessage(JSON.stringify({ type:'SEARCH', query:text }));
  }

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag) ? activeTags.filter(t=>t!==tag) : [...activeTags, tag];
    setActiveTags(next);
    webViewRef.current?.postMessage(JSON.stringify({ type:'SET_TAGS', tags:next }));
  }

  function clearTagFilter() {
    setActiveTags([]);
    webViewRef.current?.postMessage(JSON.stringify({ type:'SET_TAGS', tags:[] }));
  }

  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type==='BOOTH_SELECTED') { setSelectedBooth(booths.find(b=>b.id===msg.boothId)??null); recordVisit(msg.boothId); }
      if (msg.type==='OPEN_BOOTH') { router.push(`/booth/${msg.boothId}`); }
      if (msg.type==='ROUTE_TO') { setSelectedBooth(booths.find(b=>b.id===msg.boothId)??null); }
      if (msg.type==='SEARCH_FOUND') { setSelectedBooth(booths.find(b=>b.id===msg.boothId)??null); setSearchNotFound(false); }
      if (msg.type==='SEARCH_NOT_FOUND') { setSearchNotFound(true); }
    } catch(_) {}
  }

  async function recordVisit(boothId: string) {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user || !exhibition) return;
    await supabase.from('booth_visits').insert({ user_id:user.id, exhibition_id:exhibition.id, booth_id:boothId, interaction:'view' });
  }

  const htmlContent = buildLeafletHTML(visibleBooths, planBase64, exhibition?.color ?? Colors.primary);

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.loaderText}>Загружаем карту...</Text>
    </View>
  );

  if (!activated) return (
    <View style={styles.root}>
      <View style={styles.emptyHeader}><Text style={styles.emptyHeaderTitle}>Карта</Text></View>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>Карта не активирована</Text>
        <Text style={styles.emptyText}>Откройте страницу выставки и нажмите{'\n'}«Активировать карту»</Text>
        <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/')}>
          <Text style={styles.goBtnText}>Перейти к выставкам →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Карта</Text>
            {exhibition && getExhibitionDay(exhibition) ? (
              <Text style={styles.headerDay}>{getExhibitionDay(exhibition)}</Text>
            ) : null}
          </View>
          {exhibition && <Text style={styles.headerSub} numberOfLines={1}>{exhibition.name}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeTags.length>0 && styles.filterBtnActive]}
          onPress={() => setShowTagFilter(true)}
        >
          <IconFilter active={activeTags.length>0} />
          {activeTags.length>0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeTags.length}</Text></View>}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <View style={{ marginRight:8 }}><IconSearch /></View>
          <TextInput style={styles.searchInput} placeholder="Найти стенд на карте..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={handleSearch} />
          {search ? <TouchableOpacity onPress={()=>handleSearch('')}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity> : null}
        </View>
      </View>

      {searchNotFound && <Text style={styles.notFound}>Стенд не найден</Text>}

      {pavilions.length > 1 && (
        <View style={styles.pavilionRow}>
          {pavilions.map(pav => (
            <TouchableOpacity key={pav} style={[styles.pavBtn, activePavilion===pav&&styles.pavBtnActive]} onPress={()=>switchPavilion(pav)}>
              <Text style={[styles.pavBtnText, activePavilion===pav&&styles.pavBtnTextActive]}>Павильон {pav}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTags.length>0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeTagsRow}
          contentContainerStyle={{paddingHorizontal:16,gap:6,alignItems:'center'}}>
          {activeTags.map(tag=>(
            <TouchableOpacity key={tag} style={styles.activeTag} onPress={()=>toggleTag(tag)}>
              <Text style={styles.activeTagText}>{tag} ✕</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearTagsBtn} onPress={clearTagFilter}>
            <Text style={styles.clearTagsBtnText}>Сбросить</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <WebView ref={webViewRef} style={styles.webview} originWhitelist={['*']}
        source={{ html: htmlContent }} onMessage={handleWebViewMessage}
        javaScriptEnabled domStorageEnabled scrollEnabled={false}
        bounces={false} overScrollMode="never" mixedContentMode="always" allowFileAccess />

      {selectedBooth && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardHandle} />
          <View style={styles.selectedCardTop}>
            <View style={styles.selectedLogo}><Text style={styles.selectedLogoText}>{selectedBooth.company_name[0]}</Text></View>
            <View style={{flex:1}}>
              <Text style={styles.selectedName}>{selectedBooth.company_name}</Text>
              <Text style={styles.selectedMeta}>Стенд {selectedBooth.booth_number} · {selectedBooth.hall}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={()=>{ setSelectedBooth(null); webViewRef.current?.postMessage(JSON.stringify({type:'CLEAR_ROUTE'})); }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedBooth.tags?.length>0 && (
            <View style={styles.tagsRow}>
              {selectedBooth.tags.slice(0,4).map(tag=><View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
            </View>
          )}
          <View style={styles.cardBtns}>
            <TouchableOpacity style={styles.cardBtnSecondary} onPress={()=>{ webViewRef.current?.postMessage(JSON.stringify({type:'SEARCH',query:selectedBooth.booth_number})); }}>
              <Text style={styles.cardBtnSecondaryText}>🧭 Путь до стенда</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardBtnPrimary} onPress={()=>router.push(`/booth/${selectedBooth.id}`)}>
              <Text style={styles.cardBtnPrimaryText}>Открыть стенд →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showTagFilter && (
        <View style={styles.tagModal}>
          <View style={styles.tagModalContent}>
            <View style={styles.tagModalHandle} />
            <View style={styles.tagModalHeader}>
              <Text style={styles.tagModalTitle}>Фильтр по категориям</Text>
              <TouchableOpacity onPress={()=>setShowTagFilter(false)}><Text style={styles.tagModalClose}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.tagModalOptions}>
              {allTags.map(tag=>(
                <TouchableOpacity key={tag} style={[styles.tagOption,activeTags.includes(tag)&&styles.tagOptionActive]} onPress={()=>toggleTag(tag)}>
                  <Text style={[styles.tagOptionText,activeTags.includes(tag)&&styles.tagOptionTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.tagModalApply} onPress={()=>setShowTagFilter(false)}>
              <Text style={styles.tagModalApplyText}>Применить</Text>
            </TouchableOpacity>
            {activeTags.length>0 && (
              <TouchableOpacity style={styles.tagModalReset} onPress={()=>{ clearTagFilter(); setShowTagFilter(false); }}>
                <Text style={styles.tagModalResetText}>Сбросить фильтры</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:               {flex:1,backgroundColor:Colors.background},
  loader:             {flex:1,backgroundColor:Colors.background,alignItems:'center',justifyContent:'center',gap:12},
  loaderText:         {color:Colors.textMuted,fontSize:Font.sm},
  emptyHeader:        {paddingTop:56,paddingHorizontal:20,paddingBottom:16,borderBottomWidth:1,borderBottomColor:Colors.border},
  emptyHeaderTitle:   {fontSize:Font.lg,fontWeight:'800',color:Colors.textPrimary},
  emptyState:         {flex:1,alignItems:'center',justifyContent:'center',padding:40},
  emptyIcon:          {fontSize:56,marginBottom:20},
  emptyTitle:         {fontSize:Font.lg,fontWeight:'800',color:Colors.textPrimary,marginBottom:10,textAlign:'center'},
  emptyText:          {fontSize:Font.sm,color:Colors.textMuted,textAlign:'center',lineHeight:22,marginBottom:28},
  goBtn:              {backgroundColor:Colors.primary,borderRadius:Radius.md,paddingHorizontal:24,paddingVertical:14},
  goBtnText:          {color:'#fff',fontSize:Font.md,fontWeight:'700'},
  header:             {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingHorizontal:20,paddingBottom:12,backgroundColor:Colors.background,borderBottomWidth:1,borderBottomColor:Colors.border},
  headerLeft:         {flex:1},
  headerTitleRow:     {flexDirection:'row',alignItems:'baseline',gap:6},
  headerTitle:        {fontSize:Font.lg,fontWeight:'800',color:Colors.textPrimary},
  headerDay:          {fontSize:Font.sm,color:Colors.primary,fontWeight:'600'},
  headerSub:          {fontSize:Font.xs,color:Colors.textMuted,marginTop:2},
  filterBtn:          {width:40,height:40,borderRadius:Radius.md,backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
  filterBtnActive:    {borderColor:Colors.primary,backgroundColor:Colors.primaryLight},
  filterBadge:        {position:'absolute',top:5,right:5,width:14,height:14,borderRadius:7,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  filterBadgeText:    {color:'#fff',fontSize:8,fontWeight:'700'},
  searchRow:          {paddingHorizontal:16,paddingVertical:8,backgroundColor:Colors.background},
  searchWrap:         {flexDirection:'row',alignItems:'center',backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,paddingHorizontal:12},
  searchInput:        {flex:1,paddingVertical:10,fontSize:Font.sm,color:Colors.textPrimary},
  clearBtn:           {color:Colors.textMuted,fontSize:14,padding:4},
  notFound:           {fontSize:Font.xs,color:Colors.primary,textAlign:'center',paddingBottom:6},
  pavilionRow:        {flexDirection:'row',paddingHorizontal:16,paddingVertical:8,gap:8,backgroundColor:Colors.background},
  pavBtn:             {paddingHorizontal:14,paddingVertical:7,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface},
  pavBtnActive:       {borderColor:Colors.primary,backgroundColor:Colors.primaryLight},
  pavBtnText:         {fontSize:Font.xs,color:Colors.textMuted,fontWeight:'600'},
  pavBtnTextActive:   {color:Colors.primary},
  activeTagsRow:      {maxHeight:40,backgroundColor:Colors.background},
  activeTag:          {backgroundColor:Colors.primaryLight,borderWidth:1,borderColor:Colors.primaryBorder,borderRadius:Radius.full,paddingHorizontal:10,paddingVertical:5},
  activeTagText:      {color:Colors.primary,fontSize:Font.xs,fontWeight:'600'},
  clearTagsBtn:       {paddingHorizontal:10,paddingVertical:5},
  clearTagsBtnText:   {color:Colors.textMuted,fontSize:Font.xs},
  webview:            {flex:1},
  selectedCard:       {position:'absolute',bottom:0,left:0,right:0,backgroundColor:'#13131f',borderTopLeftRadius:20,borderTopRightRadius:20,borderTopWidth:1,borderColor:Colors.border,padding:20,paddingBottom:36},
  selectedCardHandle: {width:36,height:4,borderRadius:2,backgroundColor:Colors.border,alignSelf:'center',marginBottom:16},
  selectedCardTop:    {flexDirection:'row',alignItems:'center',gap:12,marginBottom:12},
  selectedLogo:       {width:46,height:46,borderRadius:Radius.sm,backgroundColor:Colors.primaryLight,alignItems:'center',justifyContent:'center'},
  selectedLogoText:   {fontSize:Font.lg,fontWeight:'800',color:Colors.primary},
  selectedName:       {fontSize:Font.md,fontWeight:'700',color:Colors.textPrimary},
  selectedMeta:       {fontSize:Font.xs,color:Colors.textMuted,marginTop:2},
  closeBtn:           {width:28,height:28,borderRadius:14,backgroundColor:Colors.surface,alignItems:'center',justifyContent:'center'},
  closeBtnText:       {color:Colors.textMuted,fontSize:13},
  tagsRow:            {flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:14},
  tag:                {backgroundColor:Colors.primaryLight,borderWidth:1,borderColor:Colors.primaryBorder,borderRadius:Radius.full,paddingHorizontal:10,paddingVertical:3},
  tagText:            {color:Colors.primary,fontSize:Font.xs,fontWeight:'600'},
  cardBtns:           {flexDirection:'row',gap:10},
  cardBtnPrimary:     {flex:1,backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:13,alignItems:'center'},
  cardBtnPrimaryText: {color:'#fff',fontSize:Font.sm,fontWeight:'700'},
  cardBtnSecondary:   {flex:1,backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,paddingVertical:13,alignItems:'center'},
  cardBtnSecondaryText:{color:Colors.textSecondary,fontSize:Font.sm,fontWeight:'600'},
  tagModal:           {position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  tagModalContent:    {backgroundColor:'#13131f',borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:48},
  tagModalHandle:     {width:36,height:4,borderRadius:2,backgroundColor:Colors.border,alignSelf:'center',marginBottom:20},
  tagModalHeader:     {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  tagModalTitle:      {fontSize:Font.lg,fontWeight:'800',color:Colors.textPrimary},
  tagModalClose:      {color:Colors.textMuted,fontSize:18},
  tagModalOptions:    {flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20},
  tagOption:          {paddingHorizontal:14,paddingVertical:8,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface},
  tagOptionActive:    {borderColor:Colors.primary,backgroundColor:Colors.primaryLight},
  tagOptionText:      {fontSize:Font.sm,color:Colors.textMuted,fontWeight:'600'},
  tagOptionTextActive:{color:Colors.primary},
  tagModalApply:      {backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:16,alignItems:'center',marginBottom:10},
  tagModalApplyText:  {color:'#fff',fontSize:Font.md,fontWeight:'700'},
  tagModalReset:      {borderRadius:Radius.md,paddingVertical:14,alignItems:'center'},
  tagModalResetText:  {color:Colors.textMuted,fontSize:Font.sm},
});
