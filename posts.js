const escapeHtml=(value)=>value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);

function parsePost(source,file){
  const normalized=source.replace(/\r\n/g,"\n"),match=normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const meta=match?Object.fromEntries(match[1].split("\n").map(line=>line.match(/^([A-Za-z][\w-]*):\s*(.*)$/)).filter(Boolean).map(line=>[line[1],line[2].replace(/^(["'])(.*)\1$/,"$2").trim()])):{};
  let body=(match?match[2]:normalized).trim();
  const heading=body.match(/^#\s+(.+)$/m),title=meta.title||heading?.[1].trim()||file.replace(/\.md$/,""),plain=body.replace(/^#{1,6}\s+/gm,"").replace(/[*_`>#-]/g,"").replace(/\s+/g," ").trim();
  if(!match&&heading)body=body.replace(/^#\s+.+\n?/,"").trim();
  return{slug:file.replace(/\.md$/,""),title,category:meta.category||"学习笔记",date:meta.date||"未标注日期",readTime:meta.readTime||`${Math.max(1,Math.ceil(plain.length/500))} MIN`,excerpt:meta.excerpt||`${plain.slice(0,88)}${plain.length>88?"…":""}`,body};
}

function renderMarkdown(markdown){return marked.parse(markdown,{gfm:true,breaks:false})}
function renderMath(target){if(typeof renderMathInElement!=="function")return;renderMathInElement(target,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false,ignoredTags:["script","noscript","style","textarea","pre","code"]})}
function wrapWideElements(target){target.querySelectorAll("table").forEach(table=>{if(table.parentElement?.classList.contains("table-scroll"))return;const wrapper=document.createElement("div");wrapper.className="table-scroll";table.before(wrapper);wrapper.append(table)})}

async function loadPosts(){
  const files=await fetch("posts/index.json").then(response=>{if(!response.ok)throw new Error("文章目录读取失败");return response.json()});
  const posts=await Promise.all(files.map(async entry=>{const file=String(entry).replace(/^\/+/,"");return parsePost(await fetch(`posts/${file}`).then(response=>{if(!response.ok)throw new Error(`文章读取失败：${file}`);return response.text()}),file)}));
  return posts.sort((a,b)=>/^\d/.test(b.date)-/^\d/.test(a.date)||b.date.localeCompare(a.date));
}

function renderList(posts){const list=document.querySelector("[data-post-list]");if(list)list.innerHTML=posts.map(post=>`<article class="post-entry"><h3><a href="article.html?post=${post.slug}">${post.title}</a></h3><p class="post-excerpt">${post.excerpt}</p><p class="post-meta"><span>${post.category}</span><time>${post.date}</time><b>·</b>${post.readTime} READ</p></article>`).join("")}
function renderArticle(posts){
  const article=document.querySelector("[data-article]");if(!article)return;const slug=new URLSearchParams(location.search).get("post"),post=posts.find(item=>item.slug===slug)||posts[0],next=posts[(posts.indexOf(post)+1)%posts.length];
  document.title=`${post.title}｜Ea`;article.innerHTML=`<header class="article-head"><a class="back" href="notes.html">← 全部文章</a><p class="post-meta"><span>${post.category}</span>${post.date} · ${post.readTime} READ</p><h1>${post.title}</h1><p>${post.excerpt}</p></header><div class="article-body markdown-content">${renderMarkdown(post.body)}</div><div class="article-finish"><p><strong>读到这里啦。</strong><br>谢谢你愿意花时间读完，我们下篇见。</p><img src="shinchan-sticker.png" alt="蜡笔小新挥手说再见"></div><footer class="next"><p>下一篇</p><a href="article.html?post=${next.slug}"><span>${next.category}</span>${next.title} ↗</a></footer>`;const content=article.querySelector(".markdown-content");wrapWideElements(content);renderMath(content);
}
loadPosts().then(posts=>{renderList(posts);renderArticle(posts)}).catch(error=>{const target=document.querySelector("[data-post-list], [data-article]");if(target)target.innerHTML=`<p class="post-load-error">${escapeHtml(error.message)}</p>`});
