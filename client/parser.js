const EOF = Symbol('EOF');

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;

const stack = [{type: 'document', children: []}];

function emit(token){
  console.log(token);

  let top = stack[stack.length - 1];
 
  if(token.type === 'startTag'){
    const element = {
      type: 'element',
      tagName: token.tagName,
      attributes: {},
      children: [],
    }

    for (const key in token) {
      if (Object.hasOwnProperty.call(token, key)) {
        if(key !== 'type' && key !== 'tagName')
         element.attributes[key] = token[key];
      }
    }

    top.children.push(element);

    if(token.isSelfClosing){
    }else{
      stack.push(element)
    }
    currentTextNode = null;


  }else if(token.type == 'endTag'){
    if(top.tagName === token.tagName){
      stack.pop();
    }else{
      throw new Error('end token tagName not match stack top tagName');
    }
    currentTextNode = null;
  }else if(token.type === 'text'){
    if(!currentTextNode){
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children.push(currentTextNode)
    } 
    currentTextNode.content += token.content;
  }
}


function data(c){
  if(c === '<'){
    return tagOpen;
  }
  if(c === EOF){
    emit({
      type: 'EOF'
    })
    return;
  }
  emit({
    type: 'text',
    content: c
  })
  return data;
}

function tagOpen(c){
  if(c === '/'){
    return endTagOpen
  }
  if(c.match(/^\w$/)){
    currentToken = {
      type: 'startTag',
      tagName: ''
    }
    return tagName(c);
  }

  return;
}

function endTagOpen(c){
  if(c.match(/^\w$/)){
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
    return tagName(c);
  }
  if(c === '>'){

  }
  if(c === EOF){
    return;
  }

}
// <html/> <html class="ccc"></html>
function tagName(c){
  if(c.match(/^\w$/)){
    currentToken.tagName += c;
    return tagName;
  }

  if(c === '/'){
    return selfClosingStartTag;
  }

  if(c.match(/^[\t\n\f ]$/)){
    return beforeAttributeName;
  }

  if(c === '>'){
    emit(currentToken)
    return data;
  }
}

function beforeAttributeName(c){
  if(c.match(/^[\t\n\f ]$/)){
    return beforeAttributeName;
  }
  if(['>', '/', EOF].includes(c)){
    emit(currentToken)
    return data;
    // return afterAttributeName(c);
  }

  if(c === '='){
    return afterAttributeName;
  }

  currentAttribute = {
    name: '',
    value: '',
  }
  return attributeName(c);
}

function attributeName(c){
  if(c.match(/^[\t\n\f ]$/) || ['>', '/', EOF].includes(c)){
   return afterAttributeName(c);
  }
  if(c === '='){
    return beforeAttributeValue;
  }

  if(c === '\u0000'){
    throw new Error();
  }

  if(c === '"' || c === '\'' || c === '<'){
    throw new Error();
  }

  currentAttribute.name += c;
  return attributeName;
}

function afterAttributeName(c){
  if(c === "'" || c === '"'){
    if(!currentToken.value){
      return afterAttributeName;
    }
    emit(currentToken);
    return beforeAttributeName;
  }

  if(c.match(/^[\t\n\f ]$/)){
    return afterAttributeName;
  }

  // if(c.match(/^\w$/)){
    currentToken.value += c;
    return afterAttributeName;
  
}

function beforeAttributeValue(c){
  if(c.match(/^[\t\n\f ]$/) || ['>', '/', EOF].includes(c)){
    return beforeAttributeValue;
   }
   if(c === '"'){
     return doubleQuoteAttributeValue;
   }
   if(c === '\''){
     return singleQuoteAttributeValue;
   }
   if(c === '>'){
    //  return doubleQuoteAttributeValue;
   }else{
     return noQuoteAttributeValue(c);
   }
}

function doubleQuoteAttributeValue(c){
  if(c === '"'){
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuoteAttributeValue;
   }

   if(c === '\u0000'){
    throw new Error();
  }

  if(c === EOF){
    throw new Error();
  }

  currentAttribute.value += c;
  return doubleQuoteAttributeValue;
}

function singleQuoteAttributeValue(c){
  if(c === '\''){
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuoteAttributeValue;
   }

   if(c === '\u0000'){
    throw new Error();
  }

  if(c === EOF){
    throw new Error();
  }

  currentAttribute.value += c;
  return singleQuoteAttributeValue;
}

function noQuoteAttributeValue(c){
  if(c.match(/^[\t\n\f ]$/)){
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuoteAttributeValue;
   }

   if(c === '/'){
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  }
  if(c === '>'){
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken)
    return data;
  }

   if(c === '\u0000'){
    throw new Error();
  }

  if(c === EOF){
    throw new Error();
  }

  currentAttribute.value += c;
  return singleQuoteAttributeValue;
}

// todo
function afterQuoteAttributeValue(c){
  if(c.match(/^[\t\n\f ]$/)){
    return beforeAttributeName;
   }

  if(c === '/'){
    return selfClosingStartTag;
  }
  if(c === '>'){
    emit(currentToken)
    return data;
  }

  if(c === '\u0000'){
    throw new Error();
  }

  if(c === EOF){
    throw new Error();
  }
}


function selfClosingStartTag(c){
  if(c === '>'){
    currentToken.isSelfClosing = true;
    emit(currentToken)
    return data;
  }
  if(c === EOF){

  }
}


module.exports.parseHTML = function parseHTML(html){
  console.log(html);
  let state = data;
  for (const c of html) {
    state = state(c);
  }
  state = state(EOF)

  console.log(stack);
}