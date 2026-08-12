const escapeHtml=(value)=>value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);
const safeUrl=(value)=>/^(https?:\/\/|\/|#|\.\.\/|\.\/)/.test(value)?value:"#";
const inline=(value)=>escapeHtml(value).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,text,url)=>`<a href="${safeUrl(url)}">${text}</a>`).replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*([^*]+)\*/g,"<em>$1</em>");

function parsePost(source,file){
  const match=source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);if(!match)throw new Error(`Invalid Markdown: ${file}`);
  const meta=Object.fromEntries(match[1].split("\n").map(line=>line.match(/^([A-Za-z][\w-]*):\s*(.*)$/)).filter(Boolean).map(line=>[line[1],line[2].replace(/^(["'])(.*)\1$/,"$2").trim()]));
  return{slug:file.replace(/\.md$/,""),title:meta.title,category:meta.category,date:meta.date,readTime:meta.readTime,excerpt:meta.excerpt,body:match[2].trim()};
}

function renderMarkdown(markdown){
  const lines=markdown.replace(/\r\n/g,"\n").split("\n"),html=[];let i=0;
  while(i<lines.length){
    const line=lines[i];if(!line.trim()){i++;continue}
    if(line.startsWith("```")){const lang=line.slice(3).trim(),code=[];i++;while(i<lines.length&&!lines[i].startsWith("```"))code.push(lines[i++]);i++;html.push(`<pre data-language="${escapeHtml(lang)}"><code>${escapeHtml(code.join("\n"))}</code></pre>`);continue}
    const image=line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);if(image){html.push(`<figure><img src="${safeUrl(image[2])}" alt="${escapeHtml(image[1])}">${image[1]?`<figcaption>${escapeHtml(image[1])}</figcaption>`:""}</figure>`);i++;continue}
    const heading=line.match(/^(#{2,4})\s+(.+)$/);if(heading){const level=heading[1].length;html.push(`<h${level}>${inline(heading[2])}</h${level}>`);i++;continue}
    if(/^---+$/.test(line.trim())){html.push("<hr>");i++;continue}
    if(/^>\s?/.test(line)){const quote=[];while(i<lines.length&&/^>\s?/.test(lines[i]))quote.push(lines[i++].replace(/^>\s?/,""));html.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);continue}
    const item=line.match(/^\s*(?:(\d+)\.|[-*])\s+(.+)$/);if(item){const ordered=Boolean(item[1]),items=[];while(i<lines.length){const next=lines[i].match(/^\s*(?:(\d+)\.|[-*])\s+(.+)$/);if(!next||Boolean(next[1])!==ordered)break;items.push(`<li>${inline(next[2])}</li>`);i++}const tag=ordered?"ol":"ul";html.push(`<${tag}>${items.join("")}</${tag}>`);continue}
    const paragraph=[line.trim()];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{2,4})\s|^>|^```|^---+$|^\s*(?:\d+\.|[-*])\s+|^!\[/.test(lines[i]))paragraph.push(lines[i++].trim());html.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }return html.join("");
}

async function loadPosts(){
  const files=await fetch("posts/index.json").then(response=>{if(!response.ok)throw new Error("文章目录读取失败");return response.json()});
  const posts=await Promise.all(files.map(async file=>parsePost(await fetch(`posts/${file}`).then(response=>response.text()),file)));
  return posts.sort((a,b)=>b.date.localeCompare(a.date));
}

function renderList(posts){const list=document.querySelector("[data-post-list]");if(list)list.innerHTML=posts.map(post=>`<article class="post-entry"><h3><a href="article.html?post=${post.slug}">${post.title}</a></h3><p class="post-excerpt">${post.excerpt}</p><p class="post-meta"><span>${post.category}</span><time>${post.date}</time><b>·</b>${post.readTime} READ</p></article>`).join("")}
function renderArticle(posts){
  const article=document.querySelector("[data-article]");if(!article)return;const slug=new URLSearchParams(location.search).get("post"),post=posts.find(item=>item.slug===slug)||posts[0],next=posts[(posts.indexOf(post)+1)%posts.length];
  document.title=`${post.title}｜Ea`;article.innerHTML=`<header class="article-head"><a class="back" href="notes.html">← 全部文章</a><p class="post-meta"><span>${post.category}</span>${post.date} · ${post.readTime} READ</p><h1>${post.title}</h1><p>${post.excerpt}</p></header><div class="article-body markdown-content">${renderMarkdown(post.body)}</div><div class="article-finish"><p><strong>读到这里啦。</strong><br>谢谢你愿意花时间读完，我们下篇见。</p><img src="shinchan-sticker.png" alt="蜡笔小新挥手说再见"></div><footer class="next"><p>下一篇</p><a href="article.html?post=${next.slug}"><span>${next.category}</span>${next.title} ↗</a></footer>`;
}
loadPosts().then(posts=>{renderList(posts);renderArticle(posts)}).catch(error=>{const target=document.querySelector("[data-post-list], [data-article]");if(target)target.innerHTML=`<p class="post-load-error">${escapeHtml(error.message)}</p>`});
