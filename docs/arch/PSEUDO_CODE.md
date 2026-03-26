# 伪代码预演报告

> 预演日期：2026-03-26
> 基于文档：Evolved_ARCH.md v1.0
> 预演范围：4个核心场景 + 接口匹配检查

---

## 1. 核心模块伪代码

### 1.1 用户认证模块

```go
// ========== 场景1：用户登录并开始面试 ==========

// Handler层：认证接口
func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        respondError(c, ErrInvalidParam)
        return
    }
    
    // 参数校验
    if !isValidPhone(req.Account) && !isValidEmail(req.Account) {
        respondError(c, ErrInvalidAccount)
        return
    }
    
    // 调用服务层
    resp, err := h.authService.Login(c.Request.Context(), &req)
    if err != nil {
        respondError(c, err)
        return
    }
    
    respondSuccess(c, resp)
}

// Service层：认证服务
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
    // 1. 查询用户（先查缓存）
    cacheKey := fmt.Sprintf("user:account:%s", req.Account)
    var user *User
    
    if cached, err := s.redis.Get(cacheKey).Bytes(); err == nil {
        user = decodeUser(cached)
    } else {
        // 缓存未命中，查数据库
        user, err = s.userRepo.FindByAccount(ctx, req.Account)
        if err != nil {
            return nil, ErrUserNotFound
        }
        // 写入缓存 (TTL 30min)
        s.redis.Set(cacheKey, encodeUser(user), 30*time.Minute)
    }
    
    // 2. 验证密码
    if !bcrypt.CheckPasswordHash(req.Password, user.PasswordHash) {
        return nil, ErrLoginFailed
    }
    
    // 3. 检查账号状态
    if user.Status == "locked" {
        return nil, ErrAccountLocked
    }
    
    // 4. 生成JWT Token
    accessToken, err := s.generateAccessToken(user)
    if err != nil {
        return nil, err
    }
    
    refreshToken, err := s.generateRefreshToken(user)
    if err != nil {
        return nil, err
    }
    
    // 5. 获取用户属性
    attributes, err := s.attrService.GetAttributes(ctx, user.UserID)
    if err != nil {
        return nil, err
    }
    
    // 6. 构建响应
    return &LoginResponse{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresIn:    86400,
        User: UserInfo{
            UserID:     user.UserID,
            Nickname:   user.Nickname,
            AvatarURL:  user.AvatarURL,
            Power:      attributes.Power,
            Mood:       attributes.Mood,
            HP:         attributes.HP,
            Wins:       attributes.Wins,
        },
    }, nil
}

// 用户属性服务
func (s *AttributeService) GetAttributes(ctx context.Context, userID string) (*UserAttributes, error) {
    // L1本地缓存
    if attr, ok := s.localCache.Get(userID); ok {
        return attr.(*UserAttributes), nil
    }
    
    // L2 Redis缓存
    cacheKey := fmt.Sprintf("user:attrs:%s", userID)
    if cached, err := s.redis.Get(cacheKey).Bytes(); err == nil {
        attr := decodeAttributes(cached)
        s.localCache.Set(userID, attr, 5*time.Minute)
        return attr, nil
    }
    
    // L3 数据库
    attr, err := s.attrRepo.FindByUserID(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    // 回写缓存
    s.redis.Set(cacheKey, encodeAttributes(attr), 30*time.Minute)
    s.localCache.Set(userID, attr, 5*time.Minute)
    
    return attr, nil
}
```

**接口匹配检查**：
| 文档定义 | 伪代码实现 | 状态 |
|---------|-----------|------|
| POST /api/v1/auth/login | ✅ LoginHandler实现 | 匹配 |
| Response: access_token, refresh_token, user | ✅ LoginResponse包含所有字段 | 匹配 |
| 用户属性: power, mood, hp, wins | ✅ Attributes结构体包含 | 匹配 |

---

### 1.2 面试服务模块

```go
// ========== 场景1续：创建面试会话 ==========

// Handler层：面试接口
func (h *InterviewHandler) CreateInterview(c *gin.Context) {
    userID := c.GetString("user_id") // 从JWT中获取
    
    var req CreateInterviewRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        respondError(c, ErrInvalidParam)
        return
    }
    
    // 参数校验
    validTypes := []string{"behavioral", "technical", "hr"}
    if !contains(validTypes, req.Type) {
        respondError(c, ErrInvalidInterviewType)
        return
    }
    
    resp, err := h.interviewService.Create(c.Request.Context(), userID, &req)
    if err != nil {
        respondError(c, err)
        return
    }
    
    respondSuccess(c, resp)
}

// Service层：面试服务
func (s *InterviewService) Create(ctx context.Context, userID string, req *CreateInterviewRequest) (*CreateInterviewResponse, error) {
    // 1. 检查用户面试次数限制（会员判断）
    membership, err := s.membershipService.Get(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    todayCount, err := s.repo.CountTodayInterviews(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    if membership.Type == "free" && todayCount >= 3 {
        return nil, ErrInterviewLimitExceeded
    }
    
    // 2. 选择NPC面试官
    npc, err := s.npcService.SelectNPC(ctx, &SelectNPCRequest{
        Type:       req.Type,
        Difficulty: req.Difficulty,
        NPCType:    req.NPCType,
    })
    if err != nil {
        return nil, err
    }
    
    // 3. 生成面试ID
    interviewID := generateID("i_")
    
    // 4. 预测性问题预加载（创新设计）
    go s.predictivePrefetch(userID, npc)
    
    // 5. 创建面试记录
    interview := &Interview{
        InterviewID: interviewID,
        UserID:      userID,
        Type:        req.Type,
        Status:      "pending",
        Difficulty:  req.Difficulty,
        NPC:         npc,
        CreatedAt:   time.Now(),
    }
    
    if err := s.repo.Create(ctx, interview); err != nil {
        return nil, err
    }
    
    // 6. 缓存面试会话（用于WebSocket连接后快速获取）
    sessionKey := fmt.Sprintf("interview:session:%s", interviewID)
    s.redis.Set(sessionKey, interview, 30*time.Minute)
    
    return &CreateInterviewResponse{
        InterviewID:   interviewID,
        Type:          req.Type,
        Status:        "pending",
        NPC:           npc,
        QuestionsCount: s.estimateQuestionCount(req.DurationMinutes),
        CreatedAt:     interview.CreatedAt,
    }, nil
}

// 开始面试
func (s *InterviewService) Start(ctx context.Context, interviewID string) (*StartInterviewResponse, error) {
    // 1. 获取面试信息
    interview, err := s.repo.FindByID(ctx, interviewID)
    if err != nil {
        return nil, ErrInterviewNotFound
    }
    
    // 2. 状态校验
    if interview.Status != "pending" {
        return nil, ErrInterviewAlreadyStarted
    }
    
    // 3. 生成WebSocket URL
    wsToken := s.generateWSToken(interview)
    wsURL := fmt.Sprintf("wss://ws.example.com/interview/%s?token=%s", interviewID, wsToken)
    
    // 4. 生成第一个问题
    question, err := s.questionService.GenerateFirstQuestion(ctx, interview)
    if err != nil {
        return nil, err
    }
    
    // 5. 更新状态
    interview.Status = "in_progress"
    interview.StartedAt = timePtr(time.Now())
    s.repo.Update(ctx, interview)
    
    return &StartInterviewResponse{
        InterviewID:    interviewID,
        Status:         "in_progress",
        WSURL:          wsURL,
        CurrentQuestion: question,
        StartedAt:      *interview.StartedAt,
    }, nil
}
```

**发现的问题**：
- ⚠️ **问题1**：`CreateInterviewRequest` 缺少 `duration_minutes` 字段的默认值处理
- ⚠️ **问题2**：WebSocket Token生成逻辑未在文档中定义签名算法

---

### 1.3 WebSocket通信模块

```go
// ========== 场景2：面试过程中的语音交互 ==========

// WebSocket连接处理器
func (h *WSHandler) HandleInterview(conn *websocket.Conn) {
    // 1. 解析URL参数获取interview_id和token
    interviewID, userID, err := h.parseWSRequest(conn)
    if err != nil {
        h.sendError(conn, err)
        conn.Close()
        return
    }
    
    // 2. 创建面试会话上下文
    session := &InterviewSession{
        InterviewID:  interviewID,
        UserID:       userID,
        Conn:         conn,
        SendQueue:    make(chan []byte, 100),
        AudioBuffer:  bytes.NewBuffer(nil),
        Transcript:   "",
        TurnCount:    0,
        StressLevel:  0,
        CreatedAt:    time.Now(),
    }
    
    // 3. 注册到连接管理器
    h.connManager.Register(session)
    defer h.connManager.Unregister(session)
    
    // 4. 启动读写协程
    go session.writePump()
    session.readPump()
}

// 读取客户端消息
func (s *InterviewSession) readPump() {
    defer s.Conn.Close()
    
    s.Conn.SetReadLimit(512 * 1024) // 512KB最大消息
    s.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    s.Conn.SetPongHandler(func(string) error {
        s.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })
    
    for {
        _, message, err := s.Conn.ReadMessage()
        if err != nil {
            break
        }
        
        // 解码MessagePack
        var msg WSMessage
        if err := msgpack.Unmarshal(message, &msg); err != nil {
            s.sendError(fmt.Errorf("invalid message format"))
            continue
        }
        
        // 根据消息类型处理
        switch msg.Type {
        case MessageTypeAudioData:
            s.handleAudioData(msg.Payload.([]byte), msg.Seq)
        case MessageTypeAudioEnd:
            s.handleAudioEnd()
        case MessageTypeHeartbeat:
            s.handleHeartbeat()
        default:
            s.sendError(fmt.Errorf("unknown message type: %d", msg.Type))
        }
    }
}

// 处理音频数据
func (s *InterviewSession) handleAudioData(audioData []byte, seq int) {
    // 1. 缓存音频切片
    s.AudioBuffer.Write(audioData)
    
    // 2. 流式发送到ASR服务
    go func() {
        // 检查ASR熔断器
        if !s.circuitBreaker["asr"].Allow() {
            s.handleASRFallback()
            return
        }
        
        // 调用ASR服务（流式）
        result, err := s.asrClient.StreamingRecognize(context.Background(), &ASRRequest{
            AudioData: audioData,
            Seq:       seq,
            SessionID: s.InterviewID,
        })
        
        if err != nil {
            s.circuitBreaker["asr"].RecordFailure()
            s.handleASRError(err)
            return
        }
        
        s.circuitBreaker["asr"].RecordSuccess()
        
        // 发送中间结果（可选）
        if result.IsInterim {
            s.sendMessage(MessageTypeTranscript, map[string]interface{}{
                "text":     result.Text,
                "is_final": false,
            })
        }
    }()
}

// 处理音频结束
func (s *InterviewSession) handleAudioEnd() {
    // 1. 等待ASR最终结果
    finalTranscript := s.waitForFinalTranscript()
    
    // 2. 发送识别结果给客户端
    s.sendMessage(MessageTypeTranscript, map[string]interface{}{
        "text":       finalTranscript,
        "is_final":   true,
        "confidence": s.lastASRConfidence,
    })
    
    // 3. 调用LLM生成回复
    go s.processWithLLM(finalTranscript)
}

// LLM处理流程
func (s *InterviewSession) processWithLLM(userText string) {
    // 1. 检查对话缓存
    cacheKey := normalizeQuestion(userText)
    if cached, ok := s.convCache.Get(cacheKey); ok {
        s.sendNPCResponse(cached.(string))
        return
    }
    
    // 2. 检查LLM熔断器
    if !s.circuitBreaker["llm"].Allow() {
        s.handleLLMFallback()
        return
    }
    
    // 3. 构建对话上下文
    messages := s.buildConversationContext(userText)
    
    // 4. 调用LLM（流式）
    stream, err := s.llmClient.StreamingChat(context.Background(), &LLMRequest{
        Model:    "qwen-max",
        Messages: messages,
        NPC:      s.NPC,
    })
    
    if err != nil {
        s.circuitBreaker["llm"].RecordFailure()
        s.handleLLMError(err)
        return
    }
    
    // 5. 流式处理响应
    var fullResponse strings.Builder
    for {
        chunk, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            s.handleLLMError(err)
            return
        }
        
        // 发送文本token给客户端
        s.sendMessage(MessageTypeNPCText, map[string]interface{}{
            "text":     chunk.Content,
            "is_final": false,
            "turn":     s.TurnCount,
        })
        
        fullResponse.WriteString(chunk.Content)
    }
    
    s.circuitBreaker["llm"].RecordSuccess()
    
    // 6. 缓存对话
    s.convCache.Set(cacheKey, fullResponse.String())
    
    // 7. 调用TTS合成
    s.processTTS(fullResponse.String())
}

// TTS处理流程
func (s *InterviewSession) processTTS(text string) {
    // 检查TTS熔断器
    if !s.circuitBreaker["tts"].Allow() {
        // TTS降级：只显示文字
        s.sendMessage(MessageTypeNPCText, map[string]interface{}{
            "text":     text,
            "is_final": true,
            "turn":     s.TurnCount,
            "tts_status": "unavailable",
        })
        return
    }
    
    // 流式TTS合成
    stream, err := s.ttsClient.StreamingSynthesize(context.Background(), &TTSRequest{
        Text:      text,
        VoiceID:   s.NPC.VoiceID,
        Speed:     1.0,
        Format:    "pcm",
    })
    
    if err != nil {
        s.circuitBreaker["tts"].RecordFailure()
        return
    }
    
    // 流式发送音频
    for {
        chunk, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            return
        }
        
        s.sendMessage(MessageTypeNPCAudio, chunk.AudioData)
    }
    
    s.circuitBreaker["tts"].RecordSuccess()
    
    // 更新轮次
    s.TurnCount++
    s.sendMessage(MessageTypeTurnUpdate, map[string]interface{}{
        "turn":         s.TurnCount,
        "is_user_turn": true,
    })
}

// 发送消息（MessagePack编码）
func (s *InterviewSession) sendMessage(msgType int, payload interface{}) {
    msg := WSMessage{
        Type:      msgType,
        Seq:       s.nextSeq(),
        Timestamp: time.Now().UnixMilli(),
        Payload:   payload,
    }
    
    data, _ := msgpack.Marshal(&msg)
    select {
    case s.SendQueue <- data:
    default:
        // 队列满，丢弃（防止阻塞）
    }
}
```

**接口匹配检查**：
| 文档定义 | 伪代码实现 | 状态 |
|---------|-----------|------|
| MessagePack二进制格式 | ✅ msgpack.Marshal | 匹配 |
| MessageType枚举 | ✅ 完整实现 | 匹配 |
| 音频切片100ms | ⚠️ 未验证切片大小 | 需补充 |
| 流式TTS | ✅ StreamingSynthesize | 匹配 |

---

### 1.4 AI服务调用模块

```go
// ========== 场景4：服务降级（LLM不可用） ==========

// LLM客户端（带熔断和降级）
type LLMClient struct {
    primaryProvider   LLMProvider    // 通义千问
    fallbackProvider  LLMProvider    // 文心一言
    circuitBreaker    *CircuitBreaker
    retryConfig       *RetryConfig
}

func (c *LLMClient) StreamingChat(ctx context.Context, req *LLMRequest) (LLMStream, error) {
    // 1. 尝试主服务
    if c.circuitBreaker.Allow() {
        stream, err := c.tryWithRetry(ctx, c.primaryProvider, req)
        if err == nil {
            c.circuitBreaker.RecordSuccess()
            return stream, nil
        }
        
        // 记录失败
        c.circuitBreaker.RecordFailure()
        
        // 判断是否需要熔断
        if c.circuitBreaker.ShouldOpen() {
            log.Warn("LLM主服务熔断，切换备用服务")
            return c.fallbackChat(ctx, req)
        }
    }
    
    // 2. 熔断器打开，直接使用备用服务
    return c.fallbackChat(ctx, req)
}

func (c *LLMClient) fallbackChat(ctx context.Context, req *LLMRequest) (LLMStream, error) {
    // 尝试备用服务
    stream, err := c.fallbackProvider.StreamingChat(ctx, req)
    if err != nil {
        log.Error("备用LLM服务也失败", "error", err)
        return nil, ErrAllLLMServicesUnavailable
    }
    return stream, nil
}

// 降级策略管理器
type FallbackManager struct {
    strategies map[string]FallbackStrategy
}

func (m *FallbackManager) GetStrategy(serviceType string, failureType string) FallbackStrategy {
    switch serviceType {
    case "llm":
        switch failureType {
        case "timeout":
            return &SimplifiedQuestionStrategy{}
        case "unavailable":
            return &PreRecordedInterviewStrategy{
                QuestionBank: m.preRecordedQuestions, // 50题预录库
            }
        default:
            return &DefaultFallbackStrategy{}
        }
    case "asr":
        return &TextInputStrategy{}
    case "tts":
        return &TextOnlyStrategy{}
    default:
        return &DefaultFallbackStrategy{}
    }
}

// 预录视频面试降级策略
type PreRecordedInterviewStrategy struct {
    QuestionBank []PreRecordedQuestion
}

func (s *PreRecordedInterviewStrategy) Execute(session *InterviewSession) error {
    // 1. 通知用户服务降级
    session.sendMessage(MessageTypeHint, map[string]interface{}{
        "hint":    "AI服务暂时不可用，已切换到预设问题模式",
        "emotion": "neutral",
    })
    
    // 2. 从题库选择问题
    question := s.selectQuestion(session.TurnCount)
    
    // 3. 发送预设问题
    session.sendMessage(MessageTypeNPCText, map[string]interface{}{
        "text":       question.Text,
        "is_final":   true,
        "turn":       session.TurnCount,
        "options":    question.Options, // 选择题选项
        "time_limit": question.TimeLimit,
    })
    
    // 4. 发送预设音频
    if question.AudioURL != "" {
        session.sendMessage(MessageTypeNPCAudio, question.AudioURL)
    }
    
    return nil
}

func (s *PreRecordedInterviewStrategy) selectQuestion(turnCount int) *PreRecordedQuestion {
    // 基于轮次选择难度递增的问题
    if turnCount < 3 {
        return s.QuestionBank[turnCount] // 简单问题
    } else if turnCount < 6 {
        return s.QuestionBank[20+turnCount] // 中等难度
    } else {
        return s.QuestionBank[40+turnCount] // 较难问题
    }
}

// 预录问题库结构
type PreRecordedQuestion struct {
    ID          string
    Text        string
    AudioURL    string
    Options     []string
    CorrectIdx  int
    Evaluation  map[int]ScoreEvaluation
    TimeLimit   int
    Category    string // behavioral/technical/hr
}

type ScoreEvaluation struct {
    ExpressionScore    int
    LogicScore         int
    ProfessionalScore  int
    Feedback           string
}
```

**降级流程验证**：
```
LLM调用失败
    │
    ├── 重试(最多3次，指数退避)
    │       │
    │       └── 仍失败 → 错误率累计
    │
    ├── 错误率>30% → 熔断器打开(60s)
    │       │
    │       └── 切换文心一言备用服务
    │               │
    │               ├── 成功 → 继续
    │               └── 失败 → 触发降级策略
    │
    └── 降级策略执行
            │
            ├── L1降级：简化问题返回
            │
            ├── L2降级：预录视频面试(50题)
            │
            └── L3降级：提示稍后重试
```

---

### 1.5 评分模块

```go
// ========== 场景3：面试结束评分 ==========

// 评分服务
type ScoringService struct {
    llmClient    *LLMClient
    attrService  *AttributeService
    repo         InterviewRecordRepository
    memoryStore  MemoryStore
}

func (s *ScoringService) ScoreInterview(ctx context.Context, interviewID string) (*ScoreResult, error) {
    // 1. 收集面试数据
    interview, err := s.repo.FindInterview(ctx, interviewID)
    if err != nil {
        return nil, err
    }
    
    records, err := s.repo.FindRecords(ctx, interviewID)
    if err != nil {
        return nil, err
    }
    
    // 2. 构建评分请求
    scoringPrompt := s.buildScoringPrompt(interview, records)
    
    // 3. 调用LLM进行多维度评分
    scoreResult, err := s.llmClient.Score(ctx, &ScoringRequest{
        InterviewID: interviewID,
        Transcript:  records,
        Prompt:      scoringPrompt,
        Dimensions: []string{"expression", "logic", "professional", "adaptability", "emotion"},
    })
    
    if err != nil {
        // 降级：使用规则评分
        scoreResult = s.ruleBasedScoring(records)
    }
    
    // 4. 更新用户属性
    attrChange := s.calculateAttributeChange(scoreResult)
    if err := s.attrService.UpdateAttributes(ctx, interview.UserID, attrChange); err != nil {
        log.Error("更新用户属性失败", "error", err)
    }
    
    // 5. 检查成就解锁
    achievements := s.checkAchievements(ctx, interview.UserID, scoreResult)
    
    // 6. 生成面试报告
    report := s.generateReport(interview, scoreResult, records)
    
    // 7. 保存到Memory
    if err := s.memoryStore.Save(ctx, &Memory{
        UserID:      interview.UserID,
        Type:        "interview",
        Content:     report,
        InterviewID: interviewID,
        Score:       scoreResult.Overall,
        CreatedAt:   time.Now(),
    }); err != nil {
        log.Error("保存到Memory失败", "error", err)
    }
    
    // 8. 更新面试状态
    interview.Status = "completed"
    interview.CompletedAt = timePtr(time.Now())
    interview.Scores = scoreResult
    s.repo.Update(ctx, interview)
    
    return &ScoreResult{
        InterviewID:      interviewID,
        Scores:           scoreResult,
        AttributeChange:  attrChange,
        Achievements:     achievements,
        ReportURL:        report.URL,
    }, nil
}

// 构建评分Prompt
func (s *ScoringService) buildScoringPrompt(interview *Interview, records []*InterviewRecord) string {
    return fmt.Sprintf(`
你是一位资深面试官，请根据以下面试对话记录，从5个维度对候选人进行评分：

面试类型：%s
面试难度：%s
面试官风格：%s

对话记录：
%s

请按以下格式输出评分（每项0-100分）：
{
  "expression": {"score": X, "feedback": "具体反馈"},
  "logic": {"score": X, "feedback": "具体反馈"},
  "professional": {"score": X, "feedback": "具体反馈"},
  "adaptability": {"score": X, "feedback": "具体反馈"},
  "emotion": {"score": X, "feedback": "具体反馈"},
  "highlights": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"]
}
`, interview.Type, interview.Difficulty, interview.NPC.Style, s.formatRecords(records))
}

// 计算属性变化
func (s *ScoringService) calculateAttributeChange(score *ScoreResult) *AttributeChange {
    change := &AttributeChange{}
    
    // 武力值：基于总分
    if score.Overall >= 90 {
        change.Power = 10
    } else if score.Overall >= 80 {
        change.Power = 5
    } else if score.Overall >= 60 {
        change.Power = 2
    }
    
    // 心情值：基于面试完成
    change.Mood = 3
    
    // 胜场：完成面试+1
    change.Wins = 1
    
    // HP：根据面试时长消耗
    // (面试时间越长，HP消耗越大)
    
    return change
}

// 用户属性更新
func (s *AttributeService) UpdateAttributes(ctx context.Context, userID string, change *AttributeChange) error {
    // 1. 获取当前属性
    attrs, err := s.GetAttributes(ctx, userID)
    if err != nil {
        return err
    }
    
    // 2. 计算新值（边界限制0-100）
    newAttrs := &UserAttributes{
        Power: clamp(attrs.Power+change.Power, 0, 100),
        Mood:  clamp(attrs.Mood+change.Mood, 0, 100),
        HP:    clamp(attrs.HP+change.HP, 0, 100),
        Wins:  attrs.Wins + change.Wins,
    }
    
    // 3. 更新数据库
    if err := s.repo.Update(ctx, userID, newAttrs); err != nil {
        return err
    }
    
    // 4. 刷新缓存
    s.invalidateCache(userID)
    
    // 5. 发布属性变更事件（用于其他模块）
    s.eventBus.Publish("user.attributes.changed", &AttributeChangedEvent{
        UserID:   userID,
        OldAttrs: attrs,
        NewAttrs: newAttrs,
        Change:   change,
    })
    
    return nil
}

// 生成面试报告
func (s *ScoringService) generateReport(interview *Interview, score *ScoreResult, records []*InterviewRecord) *InterviewReport {
    report := &InterviewReport{
        InterviewID: interview.InterviewID,
        Scores:      score,
        QaRecords:   records,
        CreatedAt:   time.Now(),
    }
    
    // 生成PDF报告（异步）
    go s.pdfGenerator.Generate(report)
    
    return report
}
```

---

## 2. 模块交互验证

### 2.1 数据流图

#### 场景1：用户登录并开始面试
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        用户登录 → 开始面试 数据流                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [用户输入]                                                                  │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────┐     POST /auth/login     ┌─────────────┐                       │
│  │ 前端App │ ─────────────────────────▶│  API Gateway │                      │
│  └─────────┘                           └──────┬──────┘                       │
│                                               │                             │
│                                               ▼                             │
│                                    ┌──────────────────┐                      │
│                                    │  AuthHandler     │                      │
│                                    │  (JWT验证/生成)   │                      │
│                                    └────────┬─────────┘                      │
│                                             │                               │
│              ┌──────────────────────────────┼──────────────────────────┐     │
│              │                              │                          │     │
│              ▼                              ▼                          ▼     │
│    ┌─────────────────┐            ┌─────────────────┐          ┌──────────┐ │
│    │   L1 Cache      │            │   L2 Redis      │          │ PostgreSQL│ │
│    │   (本地进程)     │◀───────────│   (用户Session) │◀─────────│ (用户表)  │ │
│    └─────────────────┘            └─────────────────┘          └──────────┘ │
│                                             │                               │
│                                             ▼                               │
│                                    ┌──────────────────┐                      │
│                                    │  登录响应        │                      │
│                                    │  - access_token  │                      │
│                                    │  - user属性      │                      │
│                                    └────────┬─────────┘                      │
│                                             │                               │
│                                             ▼                               │
│  ┌─────────┐     POST /interviews    ┌─────────────┐                        │
│  │ 前端App │◀─────────────────────────│ InterviewSvc│                        │
│  └────┬────┘                          └─────────────┘                        │
│       │                                                                      │
│       │ POST /interviews/{id}/start                                          │
│       ▼                                                                      │
│  ┌─────────┐                          ┌─────────────┐                        │
│  │ 前端App │ ─────────────────────────▶│ NPC Service │                        │
│  └─────────┘                          │ (选择面试官) │                        │
│       │                               └─────────────┘                        │
│       │                                                                      │
│       │ WebSocket连接                                                          │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │                 WebSocket集群                              │               │
│  │  ws://ws.example.com/interview/{id}?token=xxx            │               │
│  └──────────────────────────────────────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 场景2：面试过程中的语音交互
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        语音交互 数据流                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [用户说话]                                                                  │
│      │                                                                      │
│      ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                       前端处理                                     │       │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐                     │       │
│  │  │Web Audio │───▶│   VAD    │───▶│ 音频切片 │                     │       │
│  │  │  录音    │    │ 端点检测  │    │ (100ms)  │                     │       │
│  │  └──────────┘    └──────────┘    └─────┬────┘                     │       │
│  │                                        │                          │       │
│  │  ┌──────────┐                          │                          │       │
│  │  │Lip Sync  │◀─────────────────────────┤                          │       │
│  │  │本地动画  │     同步音频数据          │                          │       │
│  │  └──────────┘                          ▼                          │       │
│  └─────────────────────────────────────────┼──────────────────────────┘       │
│                                            │                                │
│                                            │ WebSocket (MessagePack)         │
│                                            ▼                                │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    WebSocket服务端                                 │       │
│  │  ┌──────────────┐                                                │       │
│  │  │ 音频切片缓冲  │                                                │       │
│  │  └──────┬───────┘                                                │       │
│  │         │                                                        │       │
│  │         ▼                                                        │       │
│  │  ┌──────────────┐     熔断检查     ┌──────────────┐              │       │
│  │  │ ASR流式识别  │◀─────────────────│ CircuitBreaker│              │       │
│  │  │ (阿里云语音)  │                  │   错误率>40%  │              │       │
│  │  └──────┬───────┘                  └───────┬──────┘              │       │
│  │         │                                  │                      │       │
│  │         │ transcript                       │ 熔断打开              │       │
│  │         ▼                                  ▼                      │       │
│  │  ┌──────────────┐                  ┌──────────────┐              │       │
│  │  │ 对话缓存检查  │                  │ 文字输入模式 │              │       │
│  │  │ (LRU 30%命中)│                  │   (降级)    │              │       │
│  │  └──────┬───────┘                  └──────────────┘              │       │
│  │         │                                                        │       │
│  │         ▼                                                        │       │
│  │  ┌──────────────┐     熔断检查     ┌──────────────┐              │       │
│  │  │ LLM流式推理  │◀─────────────────│ CircuitBreaker│              │       │
│  │  │ (通义千问)   │                  │   错误率>30%  │              │       │
│  │  └──────┬───────┘                  └───────┬──────┘              │       │
│  │         │                                  │                      │       │
│  │         │ token流                          │ 熔断打开              │       │
│  │         │                                  ▼                      │       │
│  │         │                          ┌──────────────┐              │       │
│  │         │                          │ 预录视频面试 │              │       │
│  │         │                          │  (50题库)   │              │       │
│  │         │                          └──────────────┘              │       │
│  │         ▼                                                        │       │
│  │  ┌──────────────┐                                                │       │
│  │  │ TTS流式合成  │                                                │       │
│  │  │ (阿里云语音)  │                                                │       │
│  │  └──────┬───────┘                                                │       │
│  │         │                                                        │       │
│  │         ▼                                                        │       │
│  │  ┌──────────────────────────────────────┐                        │       │
│  │  │ WebSocket推送                         │                        │       │
│  │  │ - NPC_TEXT (token流)                 │                        │       │
│  │  │ - NPC_AUDIO (音频流)                 │                        │       │
│  │  │ - TURN_UPDATE (轮次更新)             │                        │       │
│  │  └──────────────────────────────────────┘                        │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  总延迟目标: < 1.5s (用户说话到AI回复首字)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 接口匹配检查

#### HTTP API接口匹配

| 接口 | 文档定义 | 伪代码实现 | 匹配状态 |
|------|---------|-----------|---------|
| POST /auth/login | Request: account, password, device_id | ✅ LoginRequest包含所有字段 | ✅ 匹配 |
| POST /auth/login | Response: access_token, refresh_token, expires_in, user | ✅ LoginResponse包含所有字段 | ✅ 匹配 |
| POST /interviews | Request: type, position, difficulty, duration_minutes, npc_type | ⚠️ position字段未使用 | ⚠️ 需确认 |
| POST /interviews/{id}/start | Response: ws_url, current_question | ✅ 完整实现 | ✅ 匹配 |
| POST /interviews/{id}/end | Response: scores, feedback, attributes_change, achievements | ✅ 完整实现 | ✅ 匹配 |

#### WebSocket消息匹配

| 消息类型 | 文档定义 | 伪代码实现 | 匹配状态 |
|---------|---------|-----------|---------|
| AUDIO_DATA (0) | 音频切片数据 | ✅ handleAudioData | ✅ 匹配 |
| AUDIO_END (1) | 音频结束标记 | ✅ handleAudioEnd | ✅ 匹配 |
| TRANSCRIPT (2) | 语音识别结果 | ✅ sendMessage实现 | ✅ 匹配 |
| NPC_TEXT (3) | NPC文本(流式) | ✅ 流式token发送 | ✅ 匹配 |
| NPC_AUDIO (4) | NPC音频(流式) | ✅ 流式音频发送 | ✅ 匹配 |
| STRESS_UPDATE (5) | 压力值更新 | ⚠️ 未实现压力计算逻辑 | ❌ 缺失 |
| TURN_UPDATE (6) | 轮次更新 | ✅ TurnCount++ | ✅ 匹配 |
| HINT (7) | 陪跑员提示 | ⚠️ 未实现陪跑员逻辑 | ❌ MVP缺失 |
| ERROR (8) | 错误消息 | ✅ sendError实现 | ✅ 匹配 |
| INTERVIEW_END (10) | 面试结束 | ✅ 评分模块实现 | ✅ 匹配 |

#### 数据模型匹配

| 模型 | 字段 | 匹配状态 |
|------|------|---------|
| User | user_id, phone, email, nickname, attributes, pixel_avatar, membership | ✅ 匹配 |
| Interview | interview_id, user_id, type, status, difficulty, npc, scores | ✅ 匹配 |
| NPC | npc_id, name, type, style, avatar_url, system_prompt | ✅ 匹配 |
| InterviewRecord | record_id, messages, audio_url, scores, highlights | ✅ 匹配 |

---

## 3. 发现的问题

| 序号 | 问题 | 严重程度 | 影响 | 建议 |
|------|------|---------|------|------|
| 1 | **WebSocket Token生成逻辑未定义** | 高 | 安全风险，可能被伪造 | 补充Token签名算法(JWT RS256)，明确过期时间(5min) |
| 2 | **音频切片大小未验证** | 中 | 弱网环境下可能丢失数据 | 补充切片大小限制(16KB)，添加序列号校验 |
| 3 | **压力值计算逻辑缺失** | 中 | 功能不完整 | 补充压力计算算法(基于语速、停顿、用词) |
| 4 | **position字段未使用** | 低 | 接口不一致 | 确认是否需要，或从文档中移除 |
| 5 | **对话缓存Key冲突风险** | 中 | 相似问题可能命中错误缓存 | 补充语义相似度检测，或使用向量缓存 |
| 6 | **预录视频面试的评分逻辑不完整** | 高 | 降级模式下评分不公 | 补充选择题评分转5维度的映射逻辑 |
| 7 | **属性更新的并发安全性** | 高 | 多次面试可能属性计算错误 | 使用乐观锁或CAS机制 |
| 8 | **MongoDB面试记录存储时机不明确** | 中 | 数据一致性风险 | 明确是实时写入还是面试结束后批量写入 |
| 9 | **LLM评分失败时的规则评分过于简单** | 中 | 评分不准确 | 补充关键词匹配+时长的复合评分逻辑 |
| 10 | **缓存失效策略可能丢失面试数据** | 高 | 面试中断后数据丢失 | 补充面试数据持久化策略(每轮结束保存) |

### 详细问题分析

#### 问题1：WebSocket Token安全

**现状**：文档定义了 `wss://ws.example.com/interview/{id}?token={jwt_token}`，但未说明Token的生成方式。

**风险**：
- Token可能被猜测或伪造
- 没有过期机制可能导致永久有效

**建议**：
```go
func (s *AuthService) GenerateWSToken(interviewID string, userID string) (string, error) {
    claims := WSJWTClaims{
        InterviewID: interviewID,
        UserID:      userID,
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(5 * time.Minute).Unix(),
            IssuedAt:  time.Now().Unix(),
            Issuer:    "interview-service",
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    return token.SignedString(s.privateKey)
}
```

#### 问题6：预录视频面试评分逻辑

**现状**：文档定义了50道预录问题，但评分逻辑未说明。

**风险**：
- 用户选择正确答案也无法得到真实能力的评估
- 5维度评分无法从选择题推导

**建议**：
```go
type PreRecordedScoreMapping struct {
    QuestionID string
    OptionIdx  int
    Scores     struct {
        Expression    int  // 基于回答时间估算
        Logic         int  // 基于选项逻辑性
        Professional  int  // 基于选项专业度
        Adaptability  int  // 固定值
        Emotion       int  // 固定值
    }
}
```

#### 问题7：属性并发安全

**现状**：用户可能同时进行多场面试，属性更新可能并发执行。

**风险**：
```
时间线：
T1: 面试A开始，读取Power=50
T2: 面试B开始，读取Power=50
T3: 面试A结束，Power+5=55，写入
T4: 面试B结束，Power+5=55，写入 (应该是60)
```

**建议**：
```go
func (r *AttributeRepo) Update(ctx context.Context, userID string, change *AttributeChange) error {
    result := r.db.Model(&UserAttributes{}).
        Where("user_id = ? AND version = ?", userID, currentVersion).
        Update(map[string]interface{}{
            "power":   gorm.Expr("power + ?", change.Power),
            "mood":    gorm.Expr("mood + ?", change.Mood),
            "wins":    gorm.Expr("wins + ?", change.Wins),
            "version": gorm.Expr("version + 1"),
        })
    
    if result.RowsAffected == 0 {
        return ErrOptimisticLockFailed
    }
    return nil
}
```

#### 问题10：面试数据持久化

**现状**：面试数据存储在Redis Session中，面试结束后才写入MongoDB。

**风险**：
- 服务重启导致面试数据丢失
- 用户断线重连后无法恢复

**建议**：
```go
// 每轮对话结束时保存
func (s *InterviewSession) saveTurnRecord() {
    record := &TurnRecord{
        InterviewID: s.InterviewID,
        Turn:        s.TurnCount,
        UserText:    s.lastUserText,
        NPCText:     s.lastNPCText,
        Timestamp:   time.Now(),
    }
    
    // 写入MongoDB
    s.recordRepo.Append(s.InterviewID, record)
}
```

---

## 4. 预演结论

### 4.1 总体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 接口完整性 | 85% | 核心接口已定义，少量字段待确认 |
| 模块交互 | 90% | 数据流清晰，异步处理合理 |
| 降级策略 | 95% | 分级降级设计完善 |
| 数据一致性 | 70% | 存在并发安全、持久化风险 |
| 安全性 | 75% | WebSocket Token逻辑缺失 |

### 4.2 检查结果

- [x] 架构整体可行
- [x] 核心流程数据流清晰
- [x] 降级策略完善
- [x] 接口定义基本完整
- [ ] **存在问题，需要补充完善**

### 4.3 必须修复项（开发前）

1. **WebSocket Token签名算法**：补充到文档6.3节
2. **属性并发安全**：补充乐观锁机制
3. **面试数据持久化策略**：补充断线重连机制

### 4.4 建议优化项（开发中）

1. 补充音频切片大小限制和校验
2. 完善压力值计算算法
3. 补充预录视频面试的评分映射
4. 添加对话缓存语义去重

### 4.5 最终结论

```
┌────────────────────────────────────────────────────┐
│  预演结论：架构可行，需补充关键细节后开始开发        │
├────────────────────────────────────────────────────┤
│                                                    │
│  ✅ 可以开始开发的功能：                           │
│     - 用户认证模块                                │
│     - 面试创建/启动流程                           │
│     - WebSocket连接管理                           │
│     - ASR/LLM/TTS调用链路                         │
│     - 面试评分基础逻辑                            │
│                                                    │
│  ⚠️ 开发前必须补充：                               │
│     - WebSocket Token安全方案                     │
│     - 属性更新并发安全                            │
│     - 面试数据持久化策略                          │
│                                                    │
│  📋 后续迭代补充：                                 │
│     - 压力值计算逻辑 (V1.0)                       │
│     - 陪跑员提示系统 (V1.0)                       │
│     - 对话语义缓存 (V1.5)                         │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

*预演完成时间：2026-03-26*
*下一步：补充关键细节文档，开始MVP开发*
