// Initialize WebSocket connection
const ws = new WebSocket('ws://127.0.0.1:6012');
let workflows = [];
let workflow = [];
let videoFiles = [];
let imgFiles = [];
let headCounter = 0;
let GPT_messege = {}; // GPT输出数据
let stat = {}; // 统计量数据
let modelOut = {}; // 模型输出数据
let pointData = null;
let showingVideo = null; // 用于标识正在展示的视频，用于在接受gpt_messege时，展示文本
//var edgesCounter = 0;   // 用于标识边的id
let workflowLabels = []; // 用于存储workflow的标签
var top_nodes = {}; // 用于存储拓扑图的节点
var hasClick_Analyze = false
let top_all_data = null;
let top_inexp_data = null;
let top_pro_data = null;
let gt_label = null;
ws.onopen = function(event) {
    console.log("Connected to the WebSocket server");
    ws.send('delete_video');
    ws.send('delete_image');
    console.log('Clear used Datas');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    // 根据你的实际应用逻辑处理消息
    if(message.type == 'img'){
        console.log('get a img from server');
        let dataurl = 'data:image/png;base64,' + message.content;
        var id = Number(message.identifier);
        workflow.push(dataurl);
    }
    else if(message.type == 'end'){
        console.log('get Image end, now to show workflow');
        workflows.push(workflow);
        workflow = [];
        if(workflows.length == 1){
            workflowShower = document.getElementById('workflow_shower')
            picShow(workflowShower, workflows[0], true); //完成workflow的接收，展示流程图
        }
    }
    else if(message.type == 'model_out'){ // 模型输出
        console.log('get model out');
        // 对模型结果做相应处理
        console.log(message.content);
        modelOut[message.index] = message.content; // 内容存入modelOut
        if(showingVideo == message.index){
            processModelOutput(message.content);
        }
        
    }
    else if(message.type == 'gpt'){ // GPT输出
        console.log('get gpt out');
        // 对GPT结果做相应处理
        console.log(message);
        vId = message.index;
        // 执行替换
        var text = message.content;
        GPT_messege[vId] = text; // 内容存入GPT_messege
        if(showingVideo == vId){
            clearModelOutput();
            clearStatistics();
            GPT_shower = document.getElementById('GPT_shower');
            GPT_shower.innerHTML = GPT_messege[vId].replace(/\n/g, '<br>');
            GPT_Head = document.getElementById('GPT_Head');
            GPT_Head.innerHTML = 'Operation Thought Analysis';
            showStatistics(stat[vId]);
            processModelOutput(modelOut[vId]);
        }
    }
    else if(message.type == 'statistics'){
        // 统计量数据
        console.log('get statistics');
        // 对统计结果做相应处理
        console.log(message);
        // var statistics = [message.duration, message.times, message.avg_time];
        // stat[message.index] = statistics; // 存入stat
        // processStatistics(statistics);
        processStatistics(message.duration, message.avg_times, message.acc_rate);
    }
    else if(message.type == 'topology'){
        // 拓扑图数据
        console.log('get topology');
        console.log(message.content);
        // topShow(document.getElementById('topology_shower'), message.content, message.gt_label);
        top_all_data = message.content;
        gt_label = message.gt_label;
        document.getElementById('startAnalysis').textContent = 'Results are Ready';
        document.getElementById('startAnalysis').style.backgroundColor = 'white';
        document.getElementById('allUsers').click();
        preClick_for_gpt(workflows);
    }
    else if(message.type == 'pointData'){
        // 拓扑图中点对应的图片数据
        console.log('get pointData');
        pointData = message.content;
        console.log(pointData);
    }
    else if(message.type == 'familiar'){
        console.log('get familiar');
        console.log(message.content);
        // topShow(document.getElementById('twoPart_top_shower1'), message.content, message.gt_label);
        top_pro_data = message.content;
    }
    else if(message.type == 'unfamiliar'){
        console.log('get Unfamiliar');
        console.log(message.content);
        // topShow(document.getElementById('twoPart_top_shower2'), message.content, message.gt_label);
        top_inexp_data = message.content;
        
    }
    else if(message.type == 'wf_labels'){
        console.log('get wf_labels_Datas');
        workflowLabels = Array.from(message.content);
        console.log(workflowLabels);
    }
};

// 直接预览上传的视频
document.getElementById('videoInput').addEventListener('change', function() {
    if (this.files && this.files[0]) {
        // 获取文件列表
        const files = Array.from(this.files);
        // 按文件名排序
        files.sort(function(a, b){
            return a.name.localeCompare(b.name);
        });
        files.forEach(file => {
            console.log(file.name);
        });
        const videoURL = URL.createObjectURL(files[0]);
        displayVideo(videoURL);
        videoFiles = files
    }
});

// 直接预览上传的图片
document.getElementById('imageInput').addEventListener('change', function() {
    const imageFiles = Array.from(this.files);
    const imageUrls = imageFiles.map(file => URL.createObjectURL(file));
    const groundTruthShower = document.getElementById('groundTruth_shower');
    // picShow(groundTruthShower, imageUrls, false);
    imgFiles = imageFiles;
});

// 显示用户上传的视频
function displayVideo(url) {
    console.log('displaying video...')
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = url;
}

// 在表格中输出模型结果
function processModelOutput(output) {
    if(output == undefined){
        console.log('no model output now');
        return;
    }
    //// 根据模型输出的结果，更新页面上的显示
    console.log('Processing model output...');
    console.log(output); //输出模型结果
    //// 数据处理
    output = output.split(',');
    for(var i=0;i<output.length;++i){
        if(output[i] == '1'){
            output[i] = '&#x1F604;';
        }else{
            output[i] = '&#x1F622;';
        }
    }
    //// 更新页面上的显示
    // 基于median值的显示
    const hard_1 = document.getElementById('Hard_1');
    hard_1.innerHTML = output[0];
    const time_1 = document.getElementById('Time_1');
    time_1.innerHTML = output[1];
    const inf_1 = document.getElementById('Inf_1');
    inf_1.innerHTML = output[2];
    //// 基于mean值的显示
    const hard_2 = document.getElementById('Hard_2');
    hard_2.innerHTML = output[3];
    const time_2 = document.getElementById('Time_2');
    time_2.innerHTML = output[4];
    const inf_2 = document.getElementById('Inf_2');
    inf_2.innerHTML = output[5];
}
function clearModelOutput(){
    const hard_1 = document.getElementById('Hard_1');
    hard_1.innerHTML = '';
    const time_1 = document.getElementById('Time_1');
    time_1.innerHTML = '';
    const inf_1 = document.getElementById('Inf_1');
    inf_1.innerHTML = '';
    //// 基于mean值的显示
    const hard_2 = document.getElementById('Hard_2');
    hard_2.innerHTML = '';
    const time_2 = document.getElementById('Time_2');
    time_2.innerHTML = '';
    const inf_2 = document.getElementById('Inf_2');
    inf_2.innerHTML = '';
}
// 处理统计信息
function processStatistics(duration, avg_time, acc_rate) {
    for(var i=0; i<duration.length; ++i){
        var temp = [duration[i], avg_time[i], acc_rate[i]];
        stat[String(i+1)] = temp;
        console.log('stat: ', stat);
    }
}

// 处理统计结果
function showStatistics(statistics) {
    console.log('###########Now to show statistics')
    console.log(statistics);
    if(statistics == undefined){
        console.log('no statistics now');
        return;
    }
    //// 根据统计结果，更新页面上的显示
    console.log('Processing statistics...');
    console.log(statistics); //输出统计结果
    //// 数据处理
    //// 更新页面上的显示
    const duration = document.getElementById('duration');
    duration.innerHTML = parseFloat(statistics[0]).toFixed(3);
    const avg_time = document.getElementById('avg_time');
    avg_time.innerHTML = parseFloat(statistics[1]).toFixed(3);
    const acc_rate = document.getElementById('acc_rate');
    acc_rate.innerHTML = parseFloat(statistics[2]).toFixed(3);
}
function clearStatistics(){
    const duration = document.getElementById('duration');
    duration.innerHTML = '';
    const avg_time = document.getElementById('avg_time');
    avg_time.innerHTML = '';
    const acc_rate = document.getElementById('acc_rate');
    acc_rate.innerHTML = '';
}

// 展示图片(用户上传的GroundTruth以及模型输出的workflow)
// function picShow(picShowContainer, imageUrls, flag) {
//     head_pic_url = 'assets/head.png';
//     picShowContainer.innerHTML = ''; // 清空现有内容
//     if(imageUrls.length == 0){
//         console.log('no pic to show');
//         picShowContainer.innerHTML = 'waiting for images...';
//     }
//     // 首张图像的append
//     const imgElement = document.createElement('img');
//     imgElement.src = imageUrls[0];
//     imgElement.classList.add('pic');
//     picShowContainer.appendChild(imgElement);

//     imageUrls = imageUrls.slice(1, imageUrls.length);
//     imageUrls.forEach(imageUrl => {
//         // 箭头的append
//         // if(!flag){ // 添加图片版的箭头
//         //     const headElement = document.createElement('img');
//         //     headElement.src = head_pic_url;
//         //     headElement.classList.add('arrowhead_g');
//         //     picShowContainer.appendChild(headElement);
//         // }else{ // 添加按钮的箭头
//         //     const headElement = document.createElement('buttun');
//         //     headElement.classList.add('buttun_head'); //添加样式
//         //     headElement.id = headCounter; // 设置该按钮的id，用于区分按钮；
//         //     headCounter += 1;
//         //     headElement.onclick = headClick; // 点击函数绑定
//         //     const imgEle = document.createElement('img');
//         //     imgEle.src = head_pic_url;
//         //     imgEle.classList.add('arrowhead_w');
//         //     headElement.appendChild(imgEle);
//         //     picShowContainer.appendChild(headElement);
//         // }
//         const headElement = document.createElement('img');
//         headElement.src = head_pic_url;
//         headElement.classList.add('arrowhead_g');
//         picShowContainer.appendChild(headElement);
//         // 图像的append
//         const imgElement = document.createElement('img');
//         imgElement.src = imageUrl;
//         imgElement.classList.add('pic');
//         picShowContainer.appendChild(imgElement);
//     });
// }
// 3.19 version
function picShow(picShowContainer, imageUrls, flag) {
    head_pic_url = 'assets/head.png';
    picShowContainer.innerHTML = ''; // 清空现有内容
    if(imageUrls.length == 0){
        console.log('no pic to show');
        picShowContainer.innerHTML = 'waiting for images...';
    }
    // 首张图像的append
    const imgElement = document.createElement('img');
    imgElement.src = imageUrls[0];
    imgElement.classList.add('pic');

    const figureElement = document.createElement('figure');
    figureElement.classList.add('picDiv');
    const figcaptionElement = document.createElement('figcaption');
    figcaptionElement.textContent = 'pic1'; // 在这里设置标题文本

    figureElement.appendChild(imgElement);
    figureElement.appendChild(figcaptionElement);

    picShowContainer.appendChild(figureElement);
    var counter = 2;
    imageUrls = imageUrls.slice(1, imageUrls.length);
    imageUrls.forEach(imageUrl => {
        // 箭头的append
        const headElement = document.createElement('img');
        headElement.src = head_pic_url;
        headElement.classList.add('arrowhead_g');
        picShowContainer.appendChild(headElement);

        // 图像的append
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.classList.add('pic');

        const figureElement = document.createElement('figure');
        figureElement.classList.add('picDiv');
        const figcaptionElement = document.createElement('figcaption');
        figcaptionElement.textContent = 'pic' + String(counter); // 在这里设置标题文本
        counter += 1;
        figureElement.appendChild(imgElement);
        figureElement.appendChild(figcaptionElement);

        picShowContainer.appendChild(figureElement);
    });
}
// 动态添加按钮的函数
function populateVideoButtons(videoFiles) {
    const container = document.getElementById('videoButtonContainer');
    container.innerHTML = ''; // 清空之前的内容
    index = 0;
    videoFiles.forEach(videoFile => {
        const button = document.createElement('button');
        button.textContent = `User ${index + 1}`; // 为按钮添加文本
        button.classList.add('video-button');
        button.setAttribute('id', `video_${index + 1}`);
        // 使用立即执行函数来捕获当前迭代的videoFile对象
        button.onclick = (function(videoFile) {
            return function() {
                // 颜色变更
                for(var i=1;i<videoFiles.length+1;++i){
                    var bid = 'video_' + String(i);
                    document.getElementById(bid).style.backgroundColor = '#004c99';
                }
                console.log('all buttons are blue now');
                this.style.backgroundColor = '#87CEEB';
                console.log('change this');
                //
                const videoURL = URL.createObjectURL(videoFile);
                playVideo(videoURL);
                console.log('Playing ' + videoFile.name);
                videoId = Number(button.textContent.split(' ')[1])-1;
                workflowShower = document.getElementById('workflow_shower');
                console.log('want to show videoId: ', videoId);
                picShow(workflowShower, workflows[videoId], true);
            };
        })(videoFile);

        // 为按钮绑定点击事件处理函数
        button.addEventListener('click', function() {
            /////////////////////
            
            // need to corect !!!!!! model out 和统计量两表格也应同步更新
            //// 按钮被点击，GPT文本框显示对应内容
            GPT_shower = document.getElementById('GPT_shower');
            GPT_shower.innerHTML = '';
            clearModelOutput();
            clearStatistics();
            if(!hasClick_Analyze) {return;}
            vId = button.textContent.split(' ')[1]; // str, 用于辨识GPT的内容;  从1开始
            document.getElementById('table_id').innerHTML = 'Relevant Data';
            document.getElementById('only_user_show').innerHTML = 'User ' + vId + '  Analytics Dashboard';
            // document.getElementById('user_page_flow').innerHTML = "Page Flow ";
            showingVideo = vId; //标识当前展示的视频
            console.log('Video Button Clicked: ', vId); // 其id为string类型
            if(GPT_messege[vId] == undefined){
                console.log('no GPT message now');
                GPT_shower.innerHTML = 'waiting for GPT message...';
                // 向后端请求gpt内容
                const videoId = 'video_' + button.textContent.split(' ')[1]
                console.log(`Requesting to process ${videoId}`);
                ws.send(videoId);// 发送消息格式 "video_{index}"
                return;
            }else{
                console.log('Req datas of ', vId, '; now to show');
                console.log(GPT_messege[vId]);
                var text = GPT_messege[vId];
                // 更新文本框内容
                GPT_shower.innerHTML = text.replace(/\n\n/g, '<br>');
                GPT_Head = document.getElementById('GPT_Head');
                GPT_Head.innerHTML = 'Operation Thought Analysis';
                // 统计量信息
                showStatistics(stat[vId]);
                // 模型输出信息
                processModelOutput(modelOut[vId]);
            }
        });

        container.appendChild(button);
        index += 1;
    });
}

// 用于播放视频的函数
function playVideo(url) {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = url; // 更改视频源
    videoPlayer.play(); // 播放视频
}

// 上传文件
async function uploadFile(file, fileType) {
    await sendFile(file, fileType)
        .then(() => console.log(`Uploading ${fileType}...`))
        .catch(() => console.error(`Upload failed for ${fileType}`));
}

// 发送文件
function sendFile(file, fileType) {
    return new Promise((resolve, reject) => {
        ws.send(`start:${fileType}`);
        console.log('in sendFile, fileType: ', fileType);
        const reader = new FileReader();
        reader.onload = function(event) {
            const buffer = new Uint8Array(reader.result);
            const chunkSize = 1024; // 1KB chunks
            for (let i = 0; i < buffer.length; i += chunkSize) {
                const chunk = buffer.slice(i, i + chunkSize);
                ws.send(chunk);
            }
            ws.send('end');
            resolve();
        };
        reader.onerror = function() {
            console.error("File read error");
            reject();
        };
        reader.readAsArrayBuffer(file);
    });
    // return;
}

// 上传视频
async function uploadVideo(){
    console.log('video upload Click');
    if(videoFiles.length == 0){
        console.log('no video now');
        return;
    }
    populateVideoButtons(Array.from(videoFiles)); // 上传后添加按钮
    for(let i = 0;i<videoFiles.length; ++i){
        await uploadFile(videoFiles[i], videoFiles[i].type);
    }
    // console.log('jump out of uploadVideo')
    // console.log('len of workflows: ', workflows.length);
    document.getElementById('uploadVideo').textContent = 'Videos are Uploaded';
    document.getElementById('uploadVideo').style.backgroundColor = '#87CEEB';
    videoFiles = [];
}
// 上传图片
async function uploadImages(){
    console.log('img upload Click');
    if(imgFiles.length == 0){
        console.log('no img now');
        return;
    }
    for(let i = 0;i<imgFiles.length; ++i){
       await uploadFile(imgFiles[i], imgFiles[i].type);
    }
    // console.log('jump out of uploadImages')
    document.getElementById('uploadImg').textContent = 'Imgs are Uploaded';
    document.getElementById('uploadImg').style.backgroundColor = '#87CEEB';
    imgFiles = [];
}
// 上传熟悉度信息
async function uploadFamiliar(){
    console.log('Familiar upload Click');
    // 获取文件
    const fileInput = document.getElementById('FamiliarInput');
    if (!fileInput.files || !fileInput.files[0]) {
        console.log('no familiar file now');
        return;
    }
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        sendFile(file, 'csv');
    }
    document.getElementById('uploadFamiliar').textContent = 'CSV are Uploaded';
    document.getElementById('uploadFamiliar').style.backgroundColor = '#87CEEB';
}
// 上传任务信息
async function uploadScenario(){
    console.log('Scenario upload Click');
    // 获取文件
    const fileInput = document.getElementById('ScenarioInput');
    if (!fileInput.files || !fileInput.files[0]) {
        console.log('no scenario file now');
        return;
    }else{
        const file = fileInput.files[0];
        console.log('file: ', file);
        const reader = new FileReader();
        reader.onload = function(event){
            const content = reader.result;
            console.log('content: ', content);
            content_to_send = 'scenario:' + content;
            ws.send(content_to_send);
        }
        reader.readAsText(file);
    }
    document.getElementById('uploadScenario').textContent = 'TXT are Uploaded';
    document.getElementById('uploadScenario').style.backgroundColor = '#87CEEB';
}
function processCSV(csvData){
    console.log('process csv');
    console.log(csvData)
    var lines = csvData.split("\n");
    var results = [];
    // 解析每一行
    var headers = lines[0].trim().split(",");
    console.log('headers: ', headers);
    var columnIndex = headers.indexOf('familiar');
    if(columnIndex == -1){
        console.log('no familiar column');
        return;
    }
    for(var i=1;i<lines.length;i++){
        results.push(lines[i].trim().split(",")[columnIndex]);
    }
    console.log('got result of CSV');
    datas = {
        'type': 'familiar',
        'content': results
    }
    sendFile(datas, 'csv');
}
// 箭头点击函数
function headClick(){
    console.log('Button Clicked: ', this.id); // 其id为string类型
    //// 按钮被点击，文本框显示对应内容
    // 获取对应的GPT输出模块
    GPT_shower = document.getElementById('GPT_shower');
    // 更新文本框内容
    GPT_shower.innerHTML = GPT_messege[this.id].replace(/\n/g, '<br>');
}
// 拓扑图显示函数
function topShow(container, datas, gt_label=[]){
    
    console.log('come into topShow')
    var colors = [
        '#00FA9A', '#FFA500', '#8A2BE2', '#FFD700','#FF8C00',
        '#FF6347', 'FF00FF', '#FF1493', '#C71585', '#9932CC',
        '#FF0000', '#9400D3', '#ADFF2F', '#00FFFF', '#4169E1',
        '#D2691E', '#FFFF00', '#7CFC00', '#7FFF00', '00FF7F'];
    // var container = document.getElementById('topology_shower');
    // top图的设定
    options = {
        // 设置容器大小
        width: '100%',
        height: '100%',
        //
        interaction: {
            // hover: true,
            // navigationButtons: true,
            // keyboard: true,
            selectConnectedEdges: false, // 禁用选择相连边
            zoomView: false // 禁用鼠标中键滚动放大缩小
        },
        physics: {
          solver: 'forceAtlas2Based', // 使用 forceAtlas2Based 布局算法
          forceAtlas2Based: { // 设置 forceAtlas2Based 布局算法的参数
            springLength: 50, // 设置弹簧的长度
            springConstant: 0.005, // 设置弹簧的弹性系数
            avoidOverlap: 1 ,// 避免节点重叠
            centralGravity: 0.01 // 设置中心引力
          },
          stabilization: true // 禁用稳定化
        },
        nodes: {
            shape: 'box', // 设置节点的形状为方形
            size: 30, // 设置节点的大小
            borderWidth: 2,
            margin: {
                top: 5,
                bottom: 5,
                left: 5,
                right: 5
            }
        }
    };
    datas = JSON.parse(datas);
    if(container.id == 'topology_shower'){
        datas.nodes.forEach(function(node, index) {
            top_nodes[node.id] = node.label;
        });
        console.log('top_nodes: ', top_nodes);
    }
    SE_saver = {};
    gt_label = Array.from(gt_label);
    console.log(gt_label);
    console.log('init in topShow is ran')
    var ptr_Color = 0;
    groupColor = {};
    datas.edges.forEach(function(edge, index) {
        // edge.id = 'edge_' + edgesCounter; 
        // edgesCounter += 1;
        if(groupColor[edge.title] == undefined){
            groupColor[edge.title] = colors[ptr_Color];
            ptr_Color = (ptr_Color + 1) % colors.length;
        }
    });
    console.log(groupColor);
    datas.edges.forEach(function(edge, index) {
        edge.color = {color:groupColor[edge.title]};
        edge.length = 100;
    });
    if(gt_label.length != 0){
        console.log('there is gt_label');
        // 更改颜色
        var temp = new Set(gt_label);
        datas.nodes.forEach(function(node, index) {
            if(temp.has(node.label)){
                node.color = {background:'#FF6B6B'}; 
            }
        });
        // 修改起始点和终点的label
        datas.nodes.forEach(function(node, index) {
            if(node.label==gt_label[0]){
                SE_saver['Start'] = node.label;
                node.label = 'Start'; 
                pointData['Start'] = pointData[gt_label[0]];
            }
            if(node.label==gt_label[gt_label.length-1]){
                SE_saver['End'] = node.label;
                node.label = 'End'; 
                pointData['End'] = pointData[gt_label[gt_label.length-1]];
            }
        });
    }
    console.log('datas modified');
    var network = new vis.Network(container, datas, options);
    
    network.on('click', function(event) {
        const edge_head = document.getElementById('edge_head');
        edge_head.innerHTML = 'Edge Information';
        // console.log('datas.edges: ', datas.edges)
        if (event.nodes.length > 0) {
            // 节点点击事件
            var nodeId = event.nodes[0];
            console.log('nodeId: ', nodeId);
            var node = datas.nodes[nodeId];
            var nodelabel = node.label;
    
            let imgUrl = 'data:image/jpg;base64,' + pointData[nodelabel];
            var nodeshower = document.getElementById('node_shower');
            nodeshower.innerHTML = '';
    
            const imgElement = document.createElement('img');
            imgElement.src = imgUrl;
            imgElement.classList.add('pic_in_top');
            nodeshower.appendChild(imgElement);

            document.getElementById('node_head').innerHTML = 'Node:  ' + nodelabel;
        } else if (event.edges.length > 0) {
            // 边点击事件
            var edgeId = event.edges[0];
            console.log(typeof edgeId);
            var edge = datas.edges[edgeId];
            console.log('edge was Clicked: ', edgeId);
            console.log('edge : ', edge);
            console.log('edge.title : ', edge.title);
            var title = edge.title.slice(5);
            edge_head.innerHTML = 'Edge Information of user ' + String(Number(title)+1);
            console.log('title: ', title);
            const video_Button = document.getElementById('video_' + String( Number(title)+1 ) );
            video_Button.click();
            console.log('button clicked');
            edgeInfo(edge, datas.nodes, SE_saver);
            // 图像
            var from = datas.nodes[edge.from].label;
            var to = datas.nodes[edge.to].label;
            document.getElementById('node_head').innerHTML = 'Nodes:' + from + ' -> ' + to;
            var imgs = ['data:image/jpg;base64,' + pointData[from], 'data:image/jpg;base64,' + pointData[to]];
            var node_shower = document.getElementById('node_shower');
            node_shower.innerHTML = '';
            edgeShow(node_shower, imgs);
        }
    });
    console.log('network is created');
}   

// 输出edge信息
function edgeInfo(edge, nodes, SE_saver){
    const edgeInfo = document.getElementById('edge_shower');
    edgeInfo.innerHTML = ''; // 清空
    console.log('to show GPT of edge: ', edge);
    // p1Label = top_nodes[edge.from];
    // p2Label = top_nodes[edge.to];
    p1Label = nodes[edge.from].label;
    p2Label = nodes[edge.to].label;
    if(p1Label == 'Start' || p1Label == 'End'){
        p1Label = SE_saver[p1Label];
    }
    if(p2Label == 'Start' || p2Label == 'End'){
        p2Label = SE_saver[p2Label];
    }

    var p1No = -1;
    var p2No = -1;
    wf_labels_index = edge.title.slice(5); // 获取对应的workflow_labels的index
    wfl = workflowLabels[Number(wf_labels_index)];
    console.log('wf_labels_index: ', wf_labels_index);
    console.log('wfl: ', wfl);
    console.log(p1Label + ' -> ' + p2Label);
    for(var i=0;i<wfl.length-1;++i){
        if(wfl[i] == p1Label && wfl[i+1] == p2Label){
           p1No = i+1; p2No = i+2;
           break;
        }
    }
    console.log('p1No: ', p1No, 'p2No: ', p2No);
    if(p1No == -1 || p2No == -1){
        console.log('no such edge');
        return;
    }
    // 获取对应的GPT输出
    var s1 = 'pic' + String(p1No);
    var s2 = 'pic' + String(p2No);

    console.log('GPT_Index: ', String(Number(wf_labels_index)+1))
    var GPT_contents = GPT_messege[String(Number(wf_labels_index)+1)]
    console.log('GPT_messege: ', GPT_contents);
    // 暂无内容
    if(GPT_contents == undefined){
        console.log('no GPT message now');
        edgeInfo.innerHTML = 'waitting to get GPT ouput';
        return;
    }
    var result = 'something wrong with the edge';
    GPT_contents = GPT_contents.split('\n\n');
    // 模式识别
    sample_text = GPT_contents[0];
    if(sample_text.match(/\[pic\d+-pic\d+\]/g)){
        console.log('string model: [pic-pic]');
        //
        for(var i=0;i<GPT_contents.length;++i){
            content = GPT_contents[i];
            if(content.includes(s1) && content.includes(s2)){
                console.log('GPT of this edge: ', content);
                result = content;
                break;
            }
        }
    }else{
        console.log('string model: [pic]');
        for(var i=0;i<GPT_contents.length-1;++i){
            console.log('iter: ', i);
            c1 = GPT_contents[i];
            c2 = GPT_contents[i+1];
            console.log('c1:', c1)
            console.log('c2', c2)
            if(c1.includes(s1) && c2.includes(s2)){
                result = GPT_contents[i] + '\n\n' + GPT_contents[i+1];
                console.log('GPT of this edge: ', result);
                console.log('at: ', i);
                break;
            }
        }
    }
    

    
    // GPT_shower.innerHTML = GPT_messege[vId].replace(/\n/g, '<br>');
    
    edgeInfo.innerHTML = result.replace(/\n/g, '<br>');
    console.log('Edge INF Finished');
}
// 函数绑定
// document.getElementById('deleteVideo').addEventListener('click', function() {
//     ws.send('delete_video');
//     console.log("Requested to delete all videos");
// });

// document.getElementById('deleteImages').addEventListener('click', function() {
//     ws.send('delete_image');
//     console.log("Requested to delete all images");
// });

document.getElementById('startAnalysis').addEventListener('click', function() {
    if(hasClick_Analyze) {return;}
    ws.send('session_end');
    console.log("Analysis started");
    GPT_shower = document.getElementById('GPT_shower');
    GPT_shower.innerHTML = 'Choose a video to show';
    hasClick_Analyze = true;
    // 修改样式
    document.getElementById('startAnalysis').textContent = 'Please wait for the result';
    document.getElementById('startAnalysis').style.backgroundColor = '#87CEEB';
});

function preClick_for_gpt(wfs){
    console.log('preClick_for_gpt');
    if(!hasClick_Analyze) {return;}
    console.log('click times: ', wfs.length);
    for(var i=0;i<wfs.length+1;++i){
        var videoId = 'video_' + String((i%10)+1);
        const video_Button = document.getElementById(videoId);
        video_Button.click();
        console.log('clicked: ', videoId);
    }
    console.log('all clicked');
}
// document.getElementById('scrollToNext').addEventListener('click', function() {
//     const secondSection = document.querySelector('.container2');
//     secondSection.scrollIntoView({ behavior: 'smooth' });
// });

function top_ALL(){
    console.log('top_ALL');
    document.getElementById('topology_shower').innerHTML = '';
    if(top_all_data == null){
        console.log('no top_all_data');
        return;
    }
    topShow(document.getElementById('topology_shower'), top_all_data, gt_label);
    document.getElementById('allUsers').style.backgroundColor = '#87CEEB';
    document.getElementById('inexperiencedUsers').style.backgroundColor = 'white';
    document.getElementById('proficientUsers').style.backgroundColor = 'white';
}
function top_proficient(){
    console.log('top_Pro');
    document.getElementById('topology_shower').innerHTML = '';
    if(top_pro_data == null){
        console.log('no top_pro_data');
        return;
    }
    topShow(document.getElementById('topology_shower'), top_pro_data, gt_label);
    document.getElementById('allUsers').style.backgroundColor = 'white';
    document.getElementById('inexperiencedUsers').style.backgroundColor = 'white';
    document.getElementById('proficientUsers').style.backgroundColor = '#87CEEB';
}
function top_inexperienced(){
    console.log('top_Inex');
    document.getElementById('topology_shower').innerHTML = '';
    if(top_inexp_data == null){
        console.log('no top_inexp_data');
        return;
    }
    topShow(document.getElementById('topology_shower'), top_inexp_data, gt_label);
    document.getElementById('allUsers').style.backgroundColor = 'white';
    document.getElementById('inexperiencedUsers').style.backgroundColor = '#87CEEB';
    document.getElementById('proficientUsers').style.backgroundColor = 'white';
}
function edgeShow(picShowContainer, imageUrls) {
    head_pic_url = 'assets/head.png';
    picShowContainer.innerHTML = ''; // 清空现有内容
    if(imageUrls.length == 0){
        console.log('no pic to show');
        picShowContainer.innerHTML = 'waiting for images...';
        return;
    }
    if(imageUrls.length != 2){
        console.log('only one pic to show');
        return;
    }
    // 首张图像的append
    const imgElement = document.createElement('img');
    imgElement.src = imageUrls[0];
    imgElement.classList.add('pic');
    picShowContainer.appendChild(imgElement);

    // 箭头的append
    const headElement = document.createElement('img');
    headElement.src = head_pic_url;
    headElement.classList.add('arrowhead_g');
    picShowContainer.appendChild(headElement);

    // 图像的append
    const imgElement2 = document.createElement('img');
    imgElement2.src = imageUrls[1];
    imgElement2.classList.add('pic');
    picShowContainer.appendChild(imgElement2);

    console.log('edgeShow finished');

}
