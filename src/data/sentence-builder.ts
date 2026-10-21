export type BuilderQuestion={id:string;difficulty:'초급'|'중급'|'도전';korean:string;blocks:string[];answer:string[];alternatives:string[][];explanation:string}
export const builderQuestions:BuilderQuestion[]=[
 {id:'b1',difficulty:'초급',korean:'저는 카페에서 커피를 마십니다.',blocks:['私は','カフェで','コーヒーを','飲みます'],answer:['私は','カフェで','コーヒーを','飲みます'],alternatives:[['カフェで','私は','コーヒーを','飲みます']],explanation:'は는 주제, で는 행동 장소, を는 마시는 대상을 표시해요.'},
 {id:'b2',difficulty:'초급',korean:'친구와 영화를 봅니다.',blocks:['友達と','映画を','見ます'],answer:['友達と','映画を','見ます'],alternatives:[],explanation:'と는 함께하는 사람, を는 보는 대상을 표시해요.'},
 {id:'b3',difficulty:'초급',korean:'7시에 학교에 갑니다.',blocks:['七時に','学校に','行きます'],answer:['七時に','学校に','行きます'],alternatives:[['学校に','七時に','行きます']],explanation:'시간과 도착점 모두 に로 표시할 수 있어요.'},
 {id:'b4',difficulty:'초급',korean:'책상 위에 책이 있습니다.',blocks:['机の上に','本が','あります'],answer:['机の上に','本が','あります'],alternatives:[],explanation:'に는 존재 위치, が는 존재하는 사물을 표시해요.'},
 {id:'b5',difficulty:'초급',korean:'저도 일본어를 공부합니다.',blocks:['私も','日本語を','勉強します'],answer:['私も','日本語を','勉強します'],alternatives:[],explanation:'も는 “저도”, を는 공부하는 대상을 표시해요.'},
 {id:'b6',difficulty:'중급',korean:'내일 친구와 쇼핑하러 가고 싶어요.',blocks:['明日','友達と','買い物に','行きたいです'],answer:['明日','友達と','買い物に','行きたいです'],alternatives:[['友達と','明日','買い物に','行きたいです']],explanation:'동사의 ます를 떼고 たいです를 붙이면 희망을 표현해요.'},
 {id:'b7',difficulty:'중급',korean:'여기에서 사진을 찍어도 될까요?',blocks:['ここで','写真を','撮っても','いいですか'],answer:['ここで','写真を','撮っても','いいですか'],alternatives:[],explanation:'で는 행동 장소, てもいいですか는 허락을 구하는 표현이에요.'},
 {id:'b8',difficulty:'중급',korean:'비가 오기 때문에 집에 있습니다.',blocks:['雨が','降っていますから','家に','います'],answer:['雨が','降っていますから','家に','います'],alternatives:[['雨が','降っていますから','家にいます']],explanation:'문장 뒤의 から는 이유를, に는 존재 장소를 나타내요.'},
 {id:'b9',difficulty:'중급',korean:'창문을 열어 주세요.',blocks:['窓を','開けて','ください'],answer:['窓を','開けて','ください'],alternatives:[],explanation:'동사의 て형 뒤에 ください를 붙여 정중하게 부탁해요.'},
 {id:'b10',difficulty:'도전',korean:'일본에 가고 싶지만 시간이 없습니다.',blocks:['日本に','行きたいですけど','時間が','ありません'],answer:['日本に','行きたいですけど','時間が','ありません'],alternatives:[['日本へ','行きたいですけど','時間が','ありません']],explanation:'けど는 대조를 부드럽게 연결하고, が는 없는 것의 주어를 표시해요.'},
 {id:'b11',difficulty:'도전',korean:'주말에는 청소나 빨래 등을 합니다.',blocks:['週末は','掃除や','洗濯などを','します'],answer:['週末は','掃除や','洗濯などを','します'],alternatives:[],explanation:'や와 など는 여러 항목 중 대표 예시만 나열할 때 사용해요.'},
 {id:'b12',difficulty:'도전',korean:'일이 끝나면 연락해 주세요.',blocks:['仕事が','終わったら','連絡して','ください'],answer:['仕事が','終わったら','連絡して','ください'],alternatives:[],explanation:'～たら는 “~하면”, てください는 부탁을 나타내요.'}
]